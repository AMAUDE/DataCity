# Alimentation multi-sources (connecteurs)

DataCity agrège des données de **multiples sources**. Chaque source est un
**connecteur** (`scripts/ingest/`) qui télécharge les données depuis l'endpoint
officiel, les **normalise** au format interne, puis écrit un fichier dans
`data/ingested/`. Le seed (`npm run db:seed`) charge ensuite ces fichiers dans la
base, en les rattachant à leur thématique et à leur source.

## Lancer l'alimentation

```bash
node scripts/ingest/index.mjs            # tous les connecteurs
node scripts/ingest/index.mjs worldbank  # un seul connecteur
npm run db:seed                          # recharge la base avec les données ingérées
```

## Sources et connecteurs

| Source | Connecteur | Endpoint réel visé | Type de données |
|---|---|---|---|
| **Banque Mondiale** | `worldbank.mjs` | `api.worldbank.org/v2` (+ repli miroir GitHub) | Population, PIB (indicateurs) |
| **OpenStreetMap** | `osm.mjs` | API Overpass | Écoles, santé, police, banques, justice, mairies |
| **HDX (HumData)** | `hdx.mjs` | API CKAN `data.humdata.org` | Santé, éducation (jeux humanitaires CIV) |
| **Géoportail ANSTAT** | `geoportails.mjs` | WFS `geoportail.anstat.ci/geoserver` | Établissements officiels |
| **CNTIG** | `geoportails.mjs` | WFS `geoportail.cntig.ci/geoserver` | Infrastructures administratives |
| **BNETD** | `geoportails.mjs` | WFS `geoserver.bnetd.ci/geoserver` | Équipements / aménagement |
| **OpenData gouv.ci** | `geoportails.mjs` | WFS `data.gouv.ci/geoserver` | Infrastructures publiques |
| **FAO** | `fao.mjs` | FAOSTAT `fenixservices.fao.org` | Terres agricoles, forêts (indicateurs) |
| **DIVA-GIS** | `divagis.mjs` | `biogeo.ucdavis.edu/data/diva` (shapefiles) | Limites, réseaux (nécessite `npm i shapefile`) |

## État actuel des données

- ✅ **Banque Mondiale** — ingérée et chargée (population 2024, PIB 2023), via le
  miroir open-data GitHub quand l'API n'est pas joignable.
- ✅ **OpenStreetMap / ministères / geoBoundaries** — équipements de référence et
  limites administratives (districts ADM1, régions ADM2) déjà présents.
- ⏳ **OSM (Overpass), HDX, ANSTAT, CNTIG, BNETD, data.gouv.ci, FAO, DIVA-GIS** —
  connecteurs prêts. Ils se connectent à des endpoints externes qui ne sont pas
  joignables depuis l'environnement de génération (politique réseau). Lancez
  `node scripts/ingest/index.mjs` depuis une machine/déploiement disposant d'un
  accès réseau ouvert pour récupérer les données en direct, puis `npm run db:seed`.

## Ajouter/ajuster un connecteur

Chaque connecteur produit une `FeatureCollection` avec un bloc `metadata`
(`dataset`, `source`, `theme`, `license`, `verified`) et des `properties`
normalisées (`name`, `featureType`, `theme`, `admin1`…). Pour les géoportails
WFS, renseignez l'URL de base et le `typeName` réel de la couche dans
`scripts/ingest/geoportails.mjs`. Les entités sont automatiquement **rattachées**
aux limites administratives connues lors de l'import.

> Les données importées via l'interface `/admin/import` suivent le même pipeline
> de nettoyage, dédoublonnage et jointure.
