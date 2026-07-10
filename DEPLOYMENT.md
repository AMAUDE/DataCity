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

### 1. Créer une base Postgres

- **Neon** (https://neon.tech) → créez un projet → copiez la chaîne
  `postgresql://…` (avec `?sslmode=require`), **ou**
- **Vercel Postgres** (onglet *Storage* du projet Vercel).

### 2. Adapter Prisma au Postgres

Dans `prisma/schema.prisma`, changez **une seule ligne** :

```prisma
datasource db {
  provider = "postgresql"   // au lieu de "sqlite"
  url      = env("DATABASE_URL")
}
```

Puis initialisez la base distante **une fois**, depuis votre machine :

```bash
export DATABASE_URL="postgresql://…votre-url-neon…"
npx prisma db push
node prisma/seed.mjs
```

### 3. Déployer sur Vercel

1. https://vercel.com → **Add New… → Project → Import Git Repository** → choisissez
   `AMAUDE/DataCity`.
2. Framework : **Next.js** (détecté automatiquement).
3. **Environment Variables** :
   - `DATABASE_URL` = votre URL Postgres
   - `AUTH_SECRET` = une longue chaîne aléatoire (ex. `openssl rand -base64 32`)
4. **Deploy**. Vercel construit et publie sur `https://<projet>.vercel.app`.

> Le **premier compte** créé via `/register` devient administrateur et peut importer
> des données depuis `/admin/import`.

#### En cas d'erreur de moteur Prisma sur Vercel

Ajoutez la cible binaire dans le générateur de `prisma/schema.prisma` :

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}
```

puis redéployez.
