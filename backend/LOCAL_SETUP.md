# Installation en local sur votre PC (Windows / Mac / Linux)

> **TL;DR Windows** : installer Node.js LTS, double-cliquer **`start.bat`**. Données enregistrées dans `backend/data.db` sur votre PC.

## Pré-requis (à faire une seule fois)

1. Télécharger et installer **Node.js LTS** depuis https://nodejs.org/ (≥ 18, idéalement 20+)
2. Récupérer le dossier `backend/` (par exemple : `git clone` ou copie du dossier sur le disque)

## Démarrer le serveur

| OS | Méthode |
|---|---|
| **Windows** | Double-cliquer sur `backend\start.bat` |
| **Windows (PowerShell)** | `powershell -ExecutionPolicy Bypass -File backend\start.ps1` |
| **macOS / Linux** | `bash backend/start.sh` (ou `./backend/start.sh` après `chmod +x`) |

Au premier lancement, le script :
- vérifie Node.js
- exécute `npm install` (~30 s)
- génère un `JWT_SECRET` aléatoire dans `backend/.env`
- démarre le serveur
- ouvre votre navigateur sur **http://localhost:3000/cashflow.html**

Les lancements suivants sont instantanés.

## Première connexion (sans Google)

L'app affiche le bouton **« Se connecter »** dans le header. Cliquer :

- Si Google SSO n'est pas configuré (cas par défaut), un encart « Login de développement » apparaît au bas de la fenêtre.
- Saisir n'importe quel email (ex. `moi@cabinet.local`) puis cliquer **Login dev**.
- La page recharge. Vos données seront désormais synchronisées vers `backend/data.db` après chaque modification (debounce 1.5 s).

> Le « Login dev » est utile pour un usage solo en local : pas besoin de mot de passe, l'email sert juste de clé. Vous pouvez créer plusieurs emails pour cloisonner plusieurs « comptes » sur la même machine.

## Où sont vos données ?

| Couche | Chemin | Rôle |
|---|---|---|
| Navigateur | `localStorage` + IndexedDB | Cache rapide, accessible hors-ligne |
| Backend | `backend/data.db` (SQLite) | **Stockage durable sur votre PC** |

**Sauvegardes recommandées** : `backend/data.db` est un simple fichier — copiez-le périodiquement vers un disque externe ou un cloud personnel (Dropbox / Google Drive / OneDrive). Vous pouvez aussi continuer d'utiliser **Données → Sauvegarder (JSON)** dans l'app pour un export portable.

## Activer Google SSO (optionnel, ~5 min)

Si vous voulez utiliser votre compte Google pour vous connecter (et préparer un éventuel partage entre appareils) :

1. https://console.cloud.google.com/apis/credentials
2. Créer un *OAuth Client ID* type « Web application »
3. Ajouter `http://localhost:3000` dans *Authorized JavaScript origins*
4. Copier le Client ID
5. L'écrire dans :
   - **`backend/.env`** → ligne `GOOGLE_CLIENT_ID=...`
   - **`cashflow.html`** → constante `const GOOGLE_CLIENT_ID = '...'` (cherchez près du bas du fichier)
6. Redémarrer le serveur (`start.bat`), recharger la page

Le bouton Google officiel apparaîtra dans le modal de login.

## Arrêter le serveur

- Fermer la fenêtre de console qui s'est ouverte au démarrage, ou
- `Ctrl + C` dans cette fenêtre

L'app reste utilisable hors-ligne grâce au cache navigateur, mais aucune nouvelle modification ne sera persistée dans `data.db` tant que le serveur n'est pas relancé.

## Démarrage automatique au login Windows (optionnel)

1. `Win + R` → tapez `shell:startup` → Entrée (ouvre le dossier de démarrage Windows)
2. Glisser-déposer un raccourci vers `backend\start.bat` dans ce dossier
3. À chaque ouverture de session, le serveur démarrera en arrière-plan

## Désinstaller

- Supprimer le dossier `backend/` (les données partent avec — pensez à exporter avant)
- Désinstaller Node.js depuis « Applications & fonctionnalités »

## Problèmes courants

| Symptôme | Solution |
|---|---|
| « Port 3000 déjà utilisé » | Modifier `PORT=3001` dans `.env`, ou identifier le processus avec `netstat -ano | findstr :3000` puis `taskkill /PID <pid> /F` |
| Le navigateur ne s'ouvre pas | Aller manuellement sur http://localhost:3000/cashflow.html |
| « npm install » bloqué par antivirus | Autoriser temporairement, ou utiliser `npm install --no-audit --no-fund` |
| Données perdues après MAJ | Vérifier que `backend/data.db` n'a pas été supprimé — c'est la SEULE source serveur. Restaurer une sauvegarde JSON si besoin |
