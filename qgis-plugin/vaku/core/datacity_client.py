# -*- coding: utf-8 -*-
"""
Vaku — client de l'API DataCity (référentiel géographique de la Côte d'Ivoire).

Reflète fidèlement les routes existantes de l'application DataCity
(src/app/api/*) :

  GET  /api/themes-list                        -> liste des thématiques
  GET  /api/datasets?theme=<slug>               -> jeux de données (+ source, _count)
  GET  /api/features?dataset=&theme=&type=&admin1=&q=&format=&geometry=&limit=
                                                  -> entités (public, sans connexion)
  POST /api/auth/login   {email, password}      -> connexion (cookie de session)
  POST /api/auth/logout                          -> déconnexion
  GET  /api/download?dataset=<slug>&format=      -> export complet authentifié,
                                                     journalisé côté serveur (traçabilité)

/api/features est plafonné côté serveur à 20000 entités par requête (voir
route.js) et ne nécessite aucune authentification : c'est la voie utilisée
pour la consultation libre et pour le miroir local lorsque l'utilisateur
n'est pas connecté. /api/download n'a pas de plafond mais exige une session
active : c'est la voie utilisée pour un miroir local complet et pour les
exports CSV/JSON/GeoJSON avec métadonnées de licence.
"""

import json
from urllib.parse import urlencode

from . import network


class DataCityError(Exception):
    pass


class DataCityAuthError(DataCityError):
    pass


class DataCityClient:
    def __init__(self, base_url):
        if not base_url or not base_url.strip():
            raise DataCityError("URL DataCity non configurée (voir Paramètres).")
        self.base_url = base_url.strip().rstrip("/")
        self.logged_in = False
        self.user = None

    def _url(self, path, params=None):
        url = f"{self.base_url}{path}"
        if params:
            clean = {k: v for k, v in params.items() if v not in (None, "")}
            if clean:
                url += "?" + urlencode(clean)
        return url

    # ------------------------------------------------------------------
    # Lecture publique
    # ------------------------------------------------------------------

    def themes(self, feedback=None):
        return network.get_json(self._url("/api/themes-list"), feedback=feedback)

    def datasets(self, theme=None, feedback=None):
        return network.get_json(self._url("/api/datasets", {"theme": theme}), feedback=feedback)

    def features(self, dataset=None, theme=None, feature_type=None, admin1=None,
                 query=None, geometry=True, limit=20000, as_geojson=True, feedback=None):
        params = {
            "dataset": dataset,
            "theme": theme,
            "type": feature_type,
            "admin1": admin1,
            "q": query,
            "geometry": "1" if geometry else "0",
            "limit": str(limit),
            "format": "geojson" if as_geojson else "list",
        }
        return network.get_json(self._url("/api/features", params), feedback=feedback)

    # ------------------------------------------------------------------
    # Authentification (optionnelle : requise uniquement pour /api/download)
    # ------------------------------------------------------------------

    def login(self, email, password, feedback=None):
        try:
            body = network.blocking_post_json(
                self._url("/api/auth/login"), {"email": email, "password": password}, feedback=feedback
            )
        except network.VakuHttpError as exc:
            try:
                message = json.loads(exc.body.decode("utf-8")).get("error", str(exc))
            except Exception:  # noqa: BLE001
                message = str(exc)
            raise DataCityAuthError(message) from exc
        self.user = json.loads(body.decode("utf-8"))
        self.logged_in = True
        return self.user

    def logout(self, feedback=None):
        try:
            network.blocking_post(self._url("/api/auth/logout"), b"", feedback=feedback)
        finally:
            self.logged_in = False
            self.user = None

    def download_dataset(self, slug, fmt="json", feedback=None):
        """Export complet (sans plafond) d'un dataset. Requiert une connexion."""
        if not self.logged_in:
            raise DataCityAuthError("Connexion DataCity requise pour l'export complet (/api/download).")
        try:
            return network.blocking_get(
                self._url("/api/download", {"dataset": slug, "format": fmt}), feedback=feedback
            )
        except network.VakuHttpError as exc:
            if exc.status_code == 401:
                self.logged_in = False
                raise DataCityAuthError("Session DataCity expirée ou invalide, reconnectez-vous.") from exc
            raise
