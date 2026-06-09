# Installation sur Terminal Server (multi-utilisateurs RDP)

Ton PC est un Windows Terminal Server : plusieurs utilisateurs se connectent
via RDP, chacun avec sa session Windows. Tu veux que l'appli cashflow soit
accessible à tous, avec un seul serveur central et un seul `data.json`.

## Architecture

```
       ┌─ Session RDP user1 ──→ http://localhost:3000 ─┐
TS     ├─ Session RDP user2 ──→ http://localhost:3000 ─┤   →   1 seul node.exe
       └─ Session RDP user3 ──→ http://localhost:3000 ─┘       data.json partagé
```

Le serveur tourne sous le compte **SYSTEM** au démarrage de la machine.
Les utilisateurs RDP accèdent à l'appli via `localhost` (qui pointe vers la
machine TS, donc le même serveur pour tous).

## Installation (1 seule fois, en admin)

1. Place l'appli dans un dossier non-protégé, ex. `C:\Cashflow\`
2. Ouvre `C:\Cashflow\backend\`
3. **Clic droit sur `install-autostart-system.bat`** → **Exécuter en tant qu'administrateur**
4. Réponds **Oui** à la fenêtre UAC
5. Lis les messages dans la fenêtre noire :
   - `[OK] Droits administrateur confirmés.`
   - `[OK] Node.js : C:\Program Files\nodejs\node.exe`
   - `[OK] Tâche "CashflowBackend" créée (boot, compte SYSTEM).`
   - `[OK] Serveur up après Xs.`
6. Appuie sur une touche pour fermer.

## Vérification

Dans **n'importe quelle session RDP** (la tienne ou celle d'un autre user) :

1. Ouvre un navigateur
2. Va sur `http://localhost:3000/api/health`
3. Tu dois voir `{"ok":true,...}`

Si OK → tous les users peuvent maintenant aller sur `http://localhost:3000/`.

## Connexion des utilisateurs

Chaque user RDP ouvre `http://localhost:3000/` dans son navigateur, puis :

- **Pour partager les mêmes données** : tous se connectent avec **le même email**
  dans l'appli (Google SSO ou login dev). Ils voient/modifient le même cashflow.
- **Pour avoir des cashflows séparés** : chacun se connecte avec **son propre email**.
  Les données sont cloisonnées par compte dans `data.json`.

> Note : pour le moment l'appli ne gère pas l'édition concurrente avec lock.
> Si 2 utilisateurs modifient le même mois en même temps, c'est le dernier
> qui enregistre qui gagne. À utiliser idéalement par 1 personne à la fois,
> ou avec des données vraiment séparées par user.

## Logs

- `backend\server.log` — sortie console du serveur (créé au démarrage par SYSTEM)
- `backend\data.json` — toutes les données

Regarde `server.log` si le serveur ne démarre pas.

## Démarrer / arrêter le serveur manuellement (en admin)

```cmd
REM Demarrer (sans attendre le boot)
schtasks /Run /TN CashflowBackend

REM Arreter
schtasks /End /TN CashflowBackend

REM Voir l'etat
schtasks /Query /TN CashflowBackend

REM Voir si node.exe tourne sous SYSTEM
tasklist /FI "IMAGENAME eq node.exe"
```

## Désinstallation

**Clic droit sur `uninstall-autostart-system.bat`** → **Exécuter en tant qu'administrateur**.

## Dépannage

### Le serveur ne démarre pas au boot

1. Ouvre `taskschd.msc` (en admin)
2. Cherche `CashflowBackend` → onglet **Historique**
3. Si l'historique est désactivé, clic droit sur "Bibliothèque du Planificateur" → **"Activer l'historique de toutes les tâches"**
4. Regarde les erreurs

Cause fréquente : node.exe pas dans le PATH SYSTEM. Vérifie que Node.js a été
installé "Pour tous les utilisateurs" (réinstaller si besoin).

### Port 3000 déjà utilisé

```cmd
netstat -ano | findstr :3000
```

Trouve le PID, et dans le Gestionnaire des tâches arrête le processus.

### Plusieurs node.exe tournent en même temps

C'est anormal sur TS. Tu as probablement aussi gardé un autostart par-user
(dossier shell:startup). Vérifie et supprime :

```cmd
REM Pour CHAQUE utilisateur RDP :
explorer shell:startup
REM ... et supprime les raccourcis vers start-silent.vbs
```

Sur TS, **n'utilise QUE l'autostart SYSTEM** (cette installation), jamais le
dossier Démarrage par utilisateur.

### Permettre l'accès depuis d'autres machines du réseau

Par défaut, l'appli n'écoute que sur `localhost` du TS — accessible aux
sessions RDP uniquement. Pour qu'un PC du LAN puisse aussi accéder à
`http://<ip-du-TS>:3000`, il faut :

1. Modifier `server.js` pour binder sur `0.0.0.0` au lieu de `localhost`
2. Ouvrir le port 3000 dans le pare-feu Windows
3. Idéalement mettre un reverse proxy avec HTTPS

Demande-moi si tu veux exposer l'appli au-delà des sessions RDP.

## Sauvegarde

Le fichier `data.json` est la seule chose à sauvegarder. Sur TS, mets en
place une tâche planifiée admin qui le copie chaque soir vers un partage J:
ou un NAS. Je peux te préparer le script si tu veux.
