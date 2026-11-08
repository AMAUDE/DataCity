# Vaku — gestionnaire Open Data pour QGIS

Vaku est un plugin QGIS qui permet de rechercher, prévisualiser et ajouter des
couches géographiques à un projet **sans quitter QGIS**, en s'appuyant sur :

- **DataCity** — le référentiel géographique vérifié de la Côte d'Ivoire
  (ce dépôt), consultable publiquement ou en mode connecté pour un export
  complet et traçable ;
- **OpenStreetMap / Overpass** — par emprise visible dans QGIS ;
- **geoBoundaries** — limites administratives officielles (tous pays, ADM0-5) ;
- **Fonds de carte XYZ**, **services WMS/WFS**, **téléchargement direct** de
  fichiers GeoJSON/GeoPackage/GeoTIFF ;
- **HDX** (Humanitarian Data Exchange), via l'API CKAN publique ;
- **International** — FMI, UNICEF, ONU (ODD/SDG) et BAD, pour les indicateurs
  centrés sur la Côte d'Ivoire (voir avertissement ci-dessous).

## Installation

1. Compressez le dossier `vaku/` en `vaku.zip` (le dossier `vaku` doit être à
   la racine de l'archive).
2. Dans QGIS : **Extensions → Installer/Gérer les extensions → Installer à
   partir d'un ZIP**, sélectionnez `vaku.zip`.
3. Activez **Vaku** dans la liste des extensions. L'icône apparaît dans le
   menu **Web** et dans la barre d'outils.

Ou, pour le développement : copiez/liez le dossier `vaku/` dans le dossier de
profils QGIS des extensions (`QGIS3/profiles/default/python/plugins/`), puis
rechargez QGIS (ou utilisez l'extension *Plugin Reloader*).

**Dépendances** : aucune en dehors de QGIS 3.34+ et de sa distribution Python
standard (PyQt, `sqlite3`, `urllib`) — aucune bibliothèque tierce à installer.

## Premier lancement

Onglet **Paramètres** :

1. Renseignez l'**URL DataCity** (ex. `http://localhost:3000` en
   développement, ou l'URL Vercel une fois le site déployé — voir
   `../../DEPLOYMENT.md` à la racine du dépôt). Il n'y a volontairement **pas
   d'URL par défaut codée en dur** : DataCity n'a pas encore d'adresse de
   production fixe dans ce dépôt.
2. Choisissez le **dossier de sortie** où Vaku écrit les fichiers téléchargés
   (GeoJSON, GeoPackage...) avant de les ajouter au projet QGIS.

## Architecture (fiabilité)

- **Aucun appel réseau sur le thread principal.** Toutes les requêtes passent
  par `QgsBlockingNetworkRequest`, exécuté à l'intérieur d'un `QgsTask`
  (`core/network.py`). Un appel lent (Overpass, synchronisation complète...)
  ne gèle donc jamais l'interface de QGIS.
- **Mot de passe jamais stocké.** La connexion à DataCity vit uniquement en
  mémoire (cookie de session géré par `QgsNetworkAccessManager`) : elle ne
  survit pas à la fermeture de QGIS. Seul l'email est mémorisé par confort.
- **Miroir local complet** (`core/local_db.py`) : une base SQLite, stockée
  dans le profil QGIS (`QgsApplication.qgisSettingsDirPath()/vaku/`),
  reproduit le modèle DataCity (`Source`, `Theme`, `Dataset`, `Feature` —
  voir `prisma/schema.prisma`). La synchronisation :
  - utilise `/api/download` (authentifié, sans plafond) quand une session
    est active → miroir **complet** ;
  - sinon utilise `/api/features` (public) → aperçu **plafonné à 20000
    entités par jeu de données** (limite imposée par
    `src/app/api/features/route.js`, pas par Vaku).
  Une fois synchronisé, l'onglet DataCity peut ajouter des couches **sans
  réseau** depuis ce miroir.

## ⚠ Connecteurs internationaux (BAD, FMI, ONU, UNICEF)

Ces quatre connecteurs (`core/international_connector.py`) appellent des API
publiques **hors du contrôle de DataCity/Vaku**, qui n'ont pas pu être
vérifiées par un appel réel depuis l'environnement où ce plugin a été écrit
(accès réseau restreint). Avant toute utilisation :

| Source | État | Détail |
|---|---|---|
| **FMI (IMF)** | Best-effort | Service SDMX hérité (`dataservices.imf.org`). Le FMI migre vers une nouvelle API SDMX 3.0 ; certains jeux de données hérités peuvent être retirés. |
| **UNICEF** | Best-effort | SDMX REST (`sdmx.data.unicef.org`), documentation officielle : https://data.unicef.org/sdmx-api-documentation/ |
| **ONU (SDG)** | Best-effort | API officielle `unstats.un.org/SDGAPI`, explicitement documentée par l'ONU comme une **API de test**. Utilise des codes de zone **M49**, pas ISO3. |
| **BAD (AfDB)** | Non confirmé | Aucun endpoint stable trouvé publiquement. Mode **URL personnalisée uniquement** : collez l'URL d'export/API trouvée sur le portail (ex. https://cotedivoire.opendataforafrica.org). |

Utilisez le bouton **« Tester la connexion »** de l'onglet International
avant tout usage réel : il affiche les 500 premiers octets de la réponse
dans le journal, pour vérifier le format avant de l'exploiter.

Si ces sources doivent devenir fiables à long terme, la meilleure option est
de les migrer en connecteurs serveur DataCity (`scripts/ingest/`, comme
`worldbank.mjs` déjà en place) : elles bénéficieraient alors de la même
validation que le reste des données DataCity, et resteraient disponibles
pour le site web en plus du plugin.

## Structure du code

```
vaku/
  metadata.txt            Déclaration du plugin QGIS
  __init__.py              classFactory()
  plugin.py                 Cycle de vie (menu, barre d'outils)
  core/
    network.py              Requêtes HTTP non-bloquantes (QgsTask)
    settings.py              Réglages persistants (QgsSettings)
    datacity_client.py       Client API DataCity
    local_db.py              Miroir SQLite local + synchronisation
    osm_connector.py          Overpass
    geoboundaries_connector.py
    basemap_connector.py       XYZ / WMS / WFS / URL directe
    hdx_connector.py           CKAN / HDX
    international_connector.py BAD / FMI / ONU / UNICEF
    loader.py                  Ajout de couches QGIS
  ui/
    main_dialog.py            Fenêtre principale (un onglet par source)
    login_dialog.py           Connexion DataCity
```

## Limites connues

- Les datasets DataCity très volumineux (> 20000 entités) ne peuvent être
  intégralement synchronisés **qu'en étant connecté** (voir ci-dessus).
- Les connecteurs internationaux sont best-effort (voir avertissement).
- Pas encore de fournisseur *Processing* QGIS (traitement par lots, chaînage
  dans des modèles) : l'utilisation se fait depuis la fenêtre du plugin.
