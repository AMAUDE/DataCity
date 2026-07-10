# Mettre DataCity en ligne

Deux façons de publier la plateforme via un lien. Choisissez selon vos besoins.

| | GitHub Pages (vitrine) | Vercel (application complète) |
|---|---|---|
| Lien | `https://<vous>.github.io/DataCity/` | `https://<projet>.vercel.app` |
| Consultation, cartographie, tableaux | ✅ | ✅ |
| Téléchargement des données | ✅ (fichiers statiques) | ✅ (avec identification + journal) |
| Authentification des utilisateurs | ❌ | ✅ |
| Import de données (`/admin/import`) | ❌ | ✅ |
| Base de données | aucune (données figées à la génération) | Postgres hébergé |
| Coût | gratuit | gratuit (offres Hobby) |

---

## Option A — GitHub Pages (vitrine statique)

Un site consultable, hébergé par **votre** dépôt GitHub. C'est une **version démo** :
tout ce qui se consulte fonctionne (thématiques, tables, carte, téléchargements),
mais l'authentification et l'import — qui exigent un serveur — sont désactivés.

### Méthode recommandée : GitHub Actions (automatique)

Le workflow `.github/workflows/pages.yml` est déjà inclus. Il régénère la vitrine
à chaque `push` puis la déploie.

1. Poussez la branche (déjà fait).
2. Sur GitHub : **Settings → Pages**.
3. **Build and deployment → Source : GitHub Actions**.
4. (Si besoin) fusionnez la branche dans `main`, ou gardez le déclenchement sur la
   branche `claude/geographic-data-library-o0329j` déjà configuré dans le workflow.
5. Le workflow s'exécute (onglet **Actions**). À la fin, l'URL publique s'affiche :
   **`https://<votre-compte>.github.io/DataCity/`**

> Le dépôt doit être **public** (ou compte **GitHub Pro** pour des Pages privées).

### Méthode alternative : servir le dossier `/docs` (sans Actions)

Le dossier `docs/` (vitrine pré-générée) est versionné dans le dépôt.

1. **Settings → Pages → Source : Deploy from a branch**.
2. Branche : `claude/geographic-data-library-o0329j` (ou `main`) · Dossier : **`/docs`**.
3. Enregistrez : l'URL `https://<votre-compte>.github.io/DataCity/` est publiée en ~1 min.

Pour régénérer `docs/` après un changement de données :

```bash
npm run setup          # (re)charge la base
npm run export:static  # régénère docs/
```

---

## Option B — Vercel (application complète)

Toutes les fonctionnalités (authentification, import, téléchargement identifié).
Vercel exécute Next.js, mais **ne persiste pas SQLite** : il faut une base **Postgres**
hébergée (gratuite chez Neon ou Vercel Postgres).

**Le dépôt est déjà prêt pour Vercel — aucune modification de code n'est requise.**
Le fichier `vercel.json` fournit automatiquement, à chaque déploiement :

1. la génération du client Prisma avec la variante `prisma/schema.postgres.prisma` ;
2. la synchronisation du schéma sur votre base (`prisma db push`) ;
3. le chargement des données de référence **si la base est vide** (les comptes
   utilisateurs sont donc préservés entre les déploiements) ;
4. le build Next.js.

Vous n'avez donc que **3 choses à faire** :

### 1. Créer une base Postgres (gratuite)

- **Neon** (https://neon.tech) → *New Project* → copiez la chaîne de connexion
  `postgresql://…?sslmode=require`, **ou**
- **Vercel Postgres** : depuis le projet Vercel, onglet *Storage → Create Database*
  (la variable `DATABASE_URL` est alors ajoutée automatiquement).

### 2. Importer le dépôt sur Vercel

1. https://vercel.com → **Add New… → Project → Import Git Repository** → choisissez
   `AMAUDE/DataCity` (branche `claude/geographic-data-library-o0329j` ou `main`).
2. Framework : **Next.js** (détecté automatiquement). Ne touchez pas au *Build Command*
   (il est fourni par `vercel.json`).

### 3. Renseigner les variables d'environnement

Dans **Settings → Environment Variables** :

| Nom | Valeur |
|---|---|
| `DATABASE_URL` | votre URL Postgres Neon (ou auto si Vercel Postgres) |
| `AUTH_SECRET` | une longue chaîne aléatoire — ex. `openssl rand -base64 32` |

Puis **Deploy**. Au bout de ~1–2 min, la plateforme est publiée sur
`https://<projet>.vercel.app`.

> Le **premier compte** créé via `/register` devient administrateur et peut importer
> des données depuis `/admin/import`.

### Recharger les données de référence (optionnel)

Le seed est ignoré si la base contient déjà des données. Pour forcer un rechargement
complet des données de référence (efface et recharge sources/thématiques/entités) :

```bash
export DATABASE_URL="postgresql://…votre-url…"
node prisma/seed.mjs        # sans SEED_SKIP_IF_EXISTS → réinitialise les données
```

### Notes

- `prisma/schema.postgres.prisma` est une copie de `prisma/schema.prisma` avec
  `provider = "postgresql"` et `binaryTargets` adaptés à Vercel. Gardez les deux
  fichiers synchronisés si vous modifiez les modèles.
- Le développement local et la vitrine GitHub Pages continuent d'utiliser SQLite
  (`prisma/schema.prisma`), sans changement.
