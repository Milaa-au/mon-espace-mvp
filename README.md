# MonEspace

MonEspace est un tableau de bord personnel avec des Post-it, des plannings et des timers. Les widgets sont déplaçables et redimensionnables, leurs données sont sauvegardées par l’API, et une page calendrier regroupe les événements de tous les plannings.

## Prérequis

- Node.js 22 ou plus récent
- PostgreSQL 14 ou plus récent
- `psql` disponible dans le terminal

## Base de données

Crée une base PostgreSQL vide, puis configure `MonEspace/backend/.env` à partir de `MonEspace/backend/.env.example`. Depuis PowerShell, applique les migrations une seule fois dans cet ordre :

```powershell
createdb monespace
Set-Location MonEspace/backend
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f src/db/migrations/001_create_users.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f src/db/migrations/002_create_boards.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f src/db/migrations/003_create_widgets.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f src/db/migrations/004_add_timer_remaining_seconds.sql
```

Les migrations créent les utilisateurs, tableaux, widgets, événements de planning et l’état persistant des timers. Elles ne sont pas conçues pour être rejouées sur une base déjà initialisée.

## Variables d’environnement

Frontend : copie `MonEspace/.env.example` vers `MonEspace/.env.local`.

- `VITE_API_URL` : URL de l’API, par exemple `http://localhost:5000`
- `VITE_TINYMCE_API_KEY` : clé TinyMCE Cloud configurée pour le domaine frontend

Backend : copie `MonEspace/backend/.env.example` vers `MonEspace/backend/.env`.

- `DATABASE_URL` : URL PostgreSQL
- `JWT_SECRET` : valeur aléatoire longue utilisée pour signer les sessions
- `FRONTEND_URL` : origine exacte autorisée en production, sans chemin
- `CORS_ORIGINS` : origines supplémentaires séparées par des virgules, si nécessaire
- `PORT` : port HTTP (défaut local : `5000`; Render fournit sa propre valeur)
- `NODE_ENV` : `development` localement, `production` en hébergement

Ne commite jamais `.env` ou `.env.local`. Aucun secret réel ne doit être placé dans les fichiers `.env.example`.

## Lancement local

Terminal backend :

```powershell
Set-Location MonEspace/backend
npm ci
npm run dev
```

Terminal frontend :

```powershell
Set-Location MonEspace
npm ci
npm run dev
```

Vite démarre sur `http://localhost:5173`; l’API démarre sur `http://localhost:5000`.

## Déploiement

Les fichiers `netlify.toml` et `render.yaml` préparent le déploiement du frontend sur Netlify et de l’API/PostgreSQL sur Render. Aucun compte d’hébergement n’est connecté à cet environnement, donc aucun site public n’a été créé ni vérifié.

1. Sur Render, crée une nouvelle Blueprint Instance depuis ce dépôt et vérifie le service `monespace-api` et la base `monespace-db` déclarés dans `render.yaml`. Choisis un plan disponible dans ton compte si le plan gratuit n’est pas proposé.
2. Dans les variables du service API Render, règle `FRONTEND_URL` sur l’origine Netlify exacte, par exemple `https://monespace.netlify.app` (sans chemin ni slash final). `DATABASE_URL` et `JWT_SECRET` sont définis par le blueprint.
3. Crée le site Netlify depuis le même dépôt. `netlify.toml` définit le dossier `MonEspace`, la commande de build, la publication de `dist` et le fallback SPA.
4. Dans Netlify, ajoute `VITE_API_URL` avec l’URL HTTPS du service API Render (`https://<service-api>.onrender.com`) et `VITE_TINYMCE_API_KEY` avec ta clé Tiny Cloud restreinte au domaine Netlify, puis déclenche un nouveau déploiement.
5. Après la création de la base Render, exécute les commandes des migrations 001 à 004 de la section Base de données avec son `DATABASE_URL` (depuis un terminal local avec `psql` ou un shell disposant de `psql`). Ne relance pas ces migrations sur une base déjà initialisée.
6. Vérifie l’inscription, la connexion, la création des trois widgets, le déplacement/redimensionnement, le rechargement et `/calendar` en HTTPS.

Le site n’est pas encore déployé depuis cet environnement, faute d’accès aux comptes Netlify/Render. URL à compléter après création Netlify : `https://<nom-du-site>.netlify.app`.
