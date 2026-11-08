# -*- coding: utf-8 -*-
"""
Vaku — miroir local complet de DataCity (SQLite).

Reproduit le modèle de données de prisma/schema.prisma (Source, Theme,
Dataset, Feature) dans une base SQLite locale, stockée dans le profil QGIS
de l'utilisateur. Objectif : pouvoir parcourir et ajouter les couches
DataCity à QGIS même sans accès réseau, une fois une synchronisation
effectuée.

Stratégie de synchronisation (sync_all) :
  1. GET /api/themes-list  -> table `themes`
  2. GET /api/datasets     -> table `datasets` (+ table `sources`)
  3. Pour chaque dataset :
       - si une session DataCity est active : /api/download (export complet,
         sans plafond, format=json) ;
       - sinon : /api/features?dataset=...&geometry=1&limit=20000 (public,
         mais plafonné à 20000 entités côté serveur — voir DataCity
         src/app/api/features/route.js).
     Les entités du dataset sont remplacées intégralement (delete+insert) :
     stratégie simple et sûre, qui évite toute logique de diff fragile.

La base ne contient QUE des données issues de DataCity (pas les couches OSM/
geoBoundaries/HDX ajoutées à la carte, qui restent des fichiers GeoJSON
classiques sur disque, gérés indépendamment).
"""

import json
import os
import sqlite3
import time

from qgis.core import QgsApplication

from .datacity_client import DataCityAuthError

SCHEMA = """
CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    organization TEXT,
    url TEXT,
    license TEXT,
    reliability INTEGER,
    description TEXT
);

CREATE TABLE IF NOT EXISTS themes (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE,
    name TEXT,
    category TEXT,
    icon TEXT,
    description TEXT,
    color TEXT
);

CREATE TABLE IF NOT EXISTS datasets (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE,
    name TEXT,
    description TEXT,
    format TEXT,
    verified INTEGER,
    verified_at TEXT,
    verified_note TEXT,
    updated_at TEXT,
    theme_slug TEXT,
    source_name TEXT,
    feature_count INTEGER,
    local_feature_count INTEGER DEFAULT 0,
    complete INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS features (
    id TEXT PRIMARY KEY,
    dataset_slug TEXT,
    name TEXT,
    feature_type TEXT,
    latitude REAL,
    longitude REAL,
    geometry TEXT,
    properties TEXT,
    admin1 TEXT,
    admin2 TEXT,
    verified INTEGER
);
CREATE INDEX IF NOT EXISTS idx_features_dataset ON features(dataset_slug);
CREATE INDEX IF NOT EXISTS idx_features_type ON features(feature_type);

CREATE TABLE IF NOT EXISTS sync_log (
    entity TEXT PRIMARY KEY,
    last_synced_at TEXT,
    record_count INTEGER,
    status TEXT,
    message TEXT
);
"""


def default_db_path():
    base = QgsApplication.qgisSettingsDirPath()
    folder = os.path.join(base, "vaku")
    os.makedirs(folder, exist_ok=True)
    return os.path.join(folder, "vaku_datacity_mirror.sqlite3")


class LocalMirror:
    def __init__(self, path=None):
        self.path = path or default_db_path()
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        self._init_schema()

    def _connect(self):
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self):
        with self._connect() as conn:
            conn.executescript(SCHEMA)

    # ------------------------------------------------------------------
    # Synchronisation
    # ------------------------------------------------------------------

    def sync_all(self, client, log=None, progress=None, task=None):
        """
        Synchronise themes/sources/datasets/features depuis DataCity.
        `log(message)` reçoit des lignes de journal à afficher dans l'UI.
        `progress(done, total)` reçoit l'avancement (nombre de datasets).
        `task` est le QgsTask appelant, consulté pour permettre l'annulation.
        """
        log = log or (lambda msg: None)
        progress = progress or (lambda done, total: None)

        log("Récupération des thématiques…")
        themes = client.themes()
        log("Récupération des jeux de données…")
        datasets = client.datasets()

        with self._connect() as conn:
            self._upsert_themes(conn, themes)
            self._upsert_datasets_and_sources(conn, datasets)
            conn.commit()

        total = len(datasets)
        authed = client.logged_in
        mode = "export complet authentifié" if authed else "aperçu public (plafonné à 20000 entités/dataset)"
        log(f"{total} jeux de données à synchroniser — mode : {mode}.")

        done = 0
        errors = []
        for ds in datasets:
            if task is not None and task.isCanceled():
                log("Synchronisation annulée par l'utilisateur.")
                break
            slug = ds["slug"]
            try:
                count = self._sync_dataset_features(client, slug, authed)
                self._mark_dataset_synced(slug, count, complete=authed)
                log(f"  ✓ {ds['name']} ({count} entités)")
            except DataCityAuthError as exc:
                errors.append((slug, str(exc)))
                log(f"  ✗ {ds['name']} — session expirée : {exc}")
            except Exception as exc:  # noqa: BLE001
                errors.append((slug, str(exc)))
                log(f"  ✗ {ds['name']} — erreur : {exc}")
            done += 1
            progress(done, total)

        self._write_sync_log("features", total - len(errors), errors)
        return {"total": total, "errors": errors}

    def _sync_dataset_features(self, client, slug, authed):
        # Les deux voies (/api/download?format=geojson authentifié, et
        # /api/features?format=geojson public) passent par la même fonction
        # serveur featuresToGeoJSON (src/lib/geo.js) : même forme de
        # properties (nom, type, district_region, departement_commune,
        # verifie, + attributs additionnels), avec repli Point si geometry
        # est absente mais latitude/longitude existent. On les traite donc
        # de façon identique. Seule la voie authentifiée n'est pas plafonnée
        # à 20000 entités côté serveur.
        if authed:
            raw = client.download_dataset(slug, fmt="geojson")
            geojson = json.loads(raw.decode("utf-8"))
        else:
            geojson = client.features(dataset=slug, geometry=True, limit=20000, as_geojson=True)

        rows = []
        for i, feat in enumerate(geojson.get("features", [])):
            props = feat.get("properties") or {}
            geometry = feat.get("geometry")
            latitude = longitude = None
            if geometry and geometry.get("type") == "Point":
                longitude, latitude = geometry["coordinates"][0], geometry["coordinates"][1]
            rows.append(
                {
                    "id": f"{slug}:{i}",
                    "dataset_slug": slug,
                    "name": props.get("nom"),
                    "feature_type": props.get("type"),
                    "latitude": latitude,
                    "longitude": longitude,
                    "geometry": json.dumps(geometry) if geometry else None,
                    "properties": json.dumps(props, ensure_ascii=False),
                    "admin1": props.get("district_region"),
                    "admin2": props.get("departement_commune"),
                    "verified": 1 if props.get("verifie") else 0,
                }
            )

        with self._connect() as conn:
            conn.execute("DELETE FROM features WHERE dataset_slug = ?", (slug,))
            conn.executemany(
                """INSERT INTO features
                   (id, dataset_slug, name, feature_type, latitude, longitude,
                    geometry, properties, admin1, admin2, verified)
                   VALUES (:id, :dataset_slug, :name, :feature_type, :latitude, :longitude,
                           :geometry, :properties, :admin1, :admin2, :verified)""",
                rows,
            )
            conn.commit()
        return len(rows)

    def _upsert_themes(self, conn, themes):
        conn.executemany(
            """INSERT INTO themes (id, slug, name, category, icon, description, color)
               VALUES (:slug, :slug, :name, :category, :icon, NULL, :color)
               ON CONFLICT(slug) DO UPDATE SET
                 name=excluded.name, category=excluded.category,
                 icon=excluded.icon, color=excluded.color""",
            themes,
        )

    def _upsert_datasets_and_sources(self, conn, datasets):
        for ds in datasets:
            source = ds.get("source") or {}
            if source:
                conn.execute(
                    """INSERT INTO sources (id, name, organization, url, license, reliability, description)
                       VALUES (:id, :name, :organization, :url, :license, :reliability, :description)
                       ON CONFLICT(name) DO UPDATE SET
                         organization=excluded.organization, url=excluded.url,
                         license=excluded.license, reliability=excluded.reliability,
                         description=excluded.description""",
                    source,
                )
            conn.execute(
                """INSERT INTO datasets
                   (id, slug, name, description, format, verified, verified_at, verified_note,
                    updated_at, theme_slug, source_name, feature_count)
                   VALUES (:id, :slug, :name, :description, :format, :verified, :verifiedAt,
                           :verifiedNote, :updatedAt, :theme_slug, :source_name, :feature_count)
                   ON CONFLICT(slug) DO UPDATE SET
                     name=excluded.name, description=excluded.description,
                     format=excluded.format, verified=excluded.verified,
                     verified_at=excluded.verified_at, verified_note=excluded.verified_note,
                     updated_at=excluded.updated_at, theme_slug=excluded.theme_slug,
                     source_name=excluded.source_name, feature_count=excluded.feature_count""",
                {
                    "id": ds["id"],
                    "slug": ds["slug"],
                    "name": ds["name"],
                    "description": ds.get("description"),
                    "format": ds.get("format"),
                    "verified": 1 if ds.get("verified") else 0,
                    "verifiedAt": ds.get("verifiedAt"),
                    "verifiedNote": ds.get("verifiedNote"),
                    "updatedAt": ds.get("updatedAt"),
                    "theme_slug": (ds.get("theme") or {}).get("slug"),
                    "source_name": source.get("name"),
                    "feature_count": (ds.get("_count") or {}).get("features", 0),
                },
            )

    def _mark_dataset_synced(self, slug, count, complete):
        with self._connect() as conn:
            conn.execute(
                "UPDATE datasets SET local_feature_count = ?, complete = ? WHERE slug = ?",
                (count, 1 if complete else 0, slug),
            )
            conn.commit()

    def _write_sync_log(self, entity, ok_count, errors):
        with self._connect() as conn:
            conn.execute(
                """INSERT INTO sync_log (entity, last_synced_at, record_count, status, message)
                   VALUES (?, ?, ?, ?, ?)
                   ON CONFLICT(entity) DO UPDATE SET
                     last_synced_at=excluded.last_synced_at, record_count=excluded.record_count,
                     status=excluded.status, message=excluded.message""",
                (
                    entity,
                    time.strftime("%Y-%m-%dT%H:%M:%S"),
                    ok_count,
                    "ok" if not errors else "partiel",
                    "; ".join(f"{slug}: {msg}" for slug, msg in errors) if errors else "",
                ),
            )
            conn.commit()

    # ------------------------------------------------------------------
    # Lecture (hors-ligne)
    # ------------------------------------------------------------------

    def last_sync(self):
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM sync_log WHERE entity = 'features'").fetchone()
            return dict(row) if row else None

    def list_themes(self):
        with self._connect() as conn:
            return [dict(r) for r in conn.execute("SELECT * FROM themes ORDER BY category, name")]

    def list_datasets(self, theme_slug=None):
        with self._connect() as conn:
            if theme_slug:
                rows = conn.execute(
                    "SELECT * FROM datasets WHERE theme_slug = ? ORDER BY name", (theme_slug,)
                )
            else:
                rows = conn.execute("SELECT * FROM datasets ORDER BY name")
            return [dict(r) for r in rows]

    def dataset_to_geojson(self, slug):
        """Reconstruit une FeatureCollection GeoJSON depuis le miroir local, sans réseau."""
        with self._connect() as conn:
            ds_row = conn.execute("SELECT * FROM datasets WHERE slug = ?", (slug,)).fetchone()
            rows = conn.execute("SELECT * FROM features WHERE dataset_slug = ?", (slug,)).fetchall()

        features = []
        for row in rows:
            if row["geometry"]:
                geometry = json.loads(row["geometry"])
            elif row["longitude"] is not None and row["latitude"] is not None:
                geometry = {"type": "Point", "coordinates": [row["longitude"], row["latitude"]]}
            else:
                continue
            # `properties` contient déjà nom/type/district_region/... tels
            # que renvoyés par le serveur (voir featuresToGeoJSON côté
            # DataCity) : aucun champ de repli à ajouter ici.
            props = json.loads(row["properties"]) if row["properties"] else {}
            features.append({"type": "Feature", "properties": props, "geometry": geometry})

        return {
            "type": "FeatureCollection",
            "metadata": {
                "dataset": ds_row["name"] if ds_row else slug,
                "source": "Vaku — miroir local DataCity",
                "complete": bool(ds_row["complete"]) if ds_row else False,
            },
            "features": features,
        }

    def export_dataset_geojson(self, slug, output_path):
        geojson = self.dataset_to_geojson(slug)
        with open(output_path, "w", encoding="utf-8") as fh:
            json.dump(geojson, fh, ensure_ascii=False)
        return output_path
