# cashflow-backend

Sync minimal pour `cashflow.html` :
**Express + fichier JSON + Google SSO + 1 blob par utilisateur, last-write-wins.**

À peu près 200 lignes de code, zéro état serveur partagé hors `data.json` local.
Aucune compilation native (depuis la v0.3.0) — fonctionne sur n'importe quel
Windows / macOS / Linux avec juste Node.js installé.

## Installation

```bash
cd backend
npm install
cp .env.example .env
# remplis GOOGLE_CLIENT_ID + JWT_SECRET (voir ci-dessous)
npm run dev   # ou: npm start
```

Le serveur écoute par défaut sur **`http://localhost:3000`** et sert
`cashflow.html` depuis le dossier parent.

## Obtenir un Google Client ID (~5 min)

1. https://console.cloud.google.com/apis/credentials → *Create Credentials* → *OAuth client ID*
2. *Application type* = **Web application**
3. *Authorized JavaScript origins* : ajoute
   - `http://localhost:3000` (dev)
   - L'URL de prod éventuelle
4. *Authorized redirect URIs* : laisser vide (on utilise Google Identity Services côté client, pas le flux redirect classique)
5. Crée → copie le **Client ID** (du genre `123456-abc...apps.googleusercontent.com`)
6. Mets-le dans `backend/.env` (`GOOGLE_CLIENT_ID=...`) **et** dans `cashflow.html`
   (variable `GOOGLE_CLIENT_ID` au début du `<script type="text/babel">`)

## Génération du JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

## Endpoints

| Méthode | Route                  | Auth   | Description                              |
|--------:|------------------------|:------:|------------------------------------------|
|   POST  | `/api/auth/google`     | —      | `{ credential }` → `{ token, user }`     |
|   POST  | `/api/auth/dev`        | —      | `{ email }` → `{ token, user }` (si `ALLOW_DEV_LOGIN=1`) |
|    GET  | `/api/sync`            | Bearer | retourne le blob de l'utilisateur        |
|    PUT  | `/api/sync`            | Bearer | écrit le blob ; 409 si conflit           |
|    GET  | `/api/health`          | —      | `{ ok: true, ts }`                       |

## Modèle de données

Une table `users(id, email, provider, data, updated_at, created_at)` dans
`backend/data.json`. Le champ `data` est le blob JSON complet de l'app
(toutes les clés `month:*`, `categories`, `recurrenceRules`, etc.) sérialisé.

## Conflit de version

Quand le client `PUT /api/sync` il envoie `lastSeenUpdatedAt`. Si le serveur
a une version plus récente, il répond `409` avec l'état serveur. Le client
peut alors décider de fusionner manuellement (typiquement : rebase localStorage
sur la version serveur, refaire ses changements).

Pour un scénario "1 utilisateur, plusieurs appareils en alternance",
last-write-wins suffit ; le 409 n'arrive que si les deux écrivent
simultanément.

## Déploiement minimal (Render / Railway / Fly.io)

```bash
# Variables d'env requises :
GOOGLE_CLIENT_ID=...
JWT_SECRET=...
PORT=3000          # auto sur la plupart des plateformes
ALLOW_DEV_LOGIN=0  # désactive en prod !
```

`data.json` est écrit dans le dossier `backend/`. Sur les plateformes
serverless, ajoute un volume persistant (Fly volumes / Railway volumes).

Pour Render gratuit, le service "Web Service" ne persiste pas le filesystem :
passe à Postgres (5 lignes à changer dans `server.js`) ou utilise Render Disks.

## Microsoft SSO

Même pattern que Google, à ajouter en ~30 lignes :
- côté client, `@azure/msal-browser` → `loginPopup({ scopes: ['openid','email'] })`
  → récupérer `idToken`
- côté serveur, vérifier le token avec les JWKS de
  `https://login.microsoftonline.com/common/discovery/v2.0/keys`
  (lib `jose` ou `jsonwebtoken` + `jwks-rsa`).

À faire une fois le flow Google validé.
