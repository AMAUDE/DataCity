# DataCity — Bibliothèque de référence des données géographiques de Côte d'Ivoire

Plateforme web qui centralise, **corrige** et **recoupe** les données géographiques
issues de **multiples sources et formats** pour fournir une base de référence
**fiable et vérifiée** sur la Côte d'Ivoire.

Chaque donnée porte sa **source**, son **format** et son **état de vérification**.
Les utilisateurs identifiés peuvent **télécharger** les données (GeoJSON, CSV, JSON),
les explorer en **table** et les visualiser sur une **cartographie** interactive.
L'interface est **responsive** (mobile, tablette, ordinateur).

## Fonctionnalités

- **Multi-sources / multi-formats** — modèle de données traçant source, licence,
  fiabilité, format et vérification. Import de GeoJSON, CSV et JSON.
- **Données par thématique**
  - *Infrastructures* : écoles, santé, administration, sécurité, défense/militaire,
    finance, justice.
  - *Limites* : frontière nationale (pays), districts (ADM1), régions (ADM2), continent.
- **Visualisation** — tableaux filtrables/paginés **et** cartographie Leaflet
  (points + polygones administratifs).
- **Correction & jointure** — à l'import : nettoyage, dédoublonnage, et rattachement
  automatique aux limites administratives connues (jointure par nom de district/région).
- **Téléchargement identifié** — export réservé aux comptes authentifiés, avec
  journal des téléchargements (traçabilité).
- **Focalisée Côte d'Ivoire** — limites administratives réelles (geoBoundaries) et
  équipements publics géolocalisés.

## Stack technique

- **Next.js 14** (App Router) — full-stack, responsive (Tailwind CSS)
- **Prisma + SQLite** — base de données locale et portable
- **Leaflet + OpenStreetMap** — cartographie
- **Authentification** maison (mot de passe hashé bcrypt, session JWT via cookie `jose`)

## Démarrage

```bash
npm install            # installe les dépendances (génère le client Prisma)
npm run setup          # crée la base SQLite et charge les données de référence
npm run dev            # démarre en développement sur http://localhost:3000
```

Pour la production :

```bash
npm run build
npm run start
```

### Variables d'environnement (`.env`)

```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="changez-moi-en-production"
```

## Comptes & rôles

- Le **premier compte créé** via `/register` devient **administrateur**.
- Les administrateurs accèdent à `/admin/import` pour intégrer de nouvelles données.
- Tout utilisateur identifié peut télécharger les jeux de données.

## Importer des données (n'importe quelle source)

Depuis `/admin/import`, collez un **CSV** (colonnes `nom/latitude/longitude/...`,
séparateur `,` ou `;`) ou un **GeoJSON** (`FeatureCollection`). Les données sont :

1. **normalisées** (détection des colonnes lat/lon/nom/type sous divers intitulés) ;
2. **nettoyées** (rejet des entrées vides, dédoublonnage) ;
3. **jointes** aux districts/régions connus lorsque le rattachement est identifiable.

## Structure

```
prisma/schema.prisma     Modèle : User, Source, Theme, Dataset, Feature, Download
prisma/seed.mjs          Chargement des sources, thématiques et données de référence
data/                    GeoJSON réels (pays, ADM1, ADM2) + infrastructures
src/app/                 Pages (accueil, thématiques, explorer, carte, sources, admin)
src/app/api/             API : auth, features, datasets, download, import, stats
src/components/          Nav, DataExplorer, MapView, DownloadButtons, ImportForm, AuthForm
src/lib/                 db (Prisma), session (JWT), geo (export GeoJSON/CSV)
```

## Sources des données de référence

- **geoBoundaries** (gbOpen, CC BY 4.0) — frontière nationale, districts, régions.
- Institutions publiques ivoiriennes (Éducation, Santé, Justice, INS-CI, BCEAO) et
  **OpenStreetMap** (ODbL) — implantations d'équipements publics géolocalisés.

Les coordonnées des équipements sont des points de référence des principaux
établissements ; elles peuvent être enrichies et vérifiées via l'outil d'import.
