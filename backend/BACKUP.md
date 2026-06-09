# Sauvegarde quotidienne vers J:

`data.json` est copié tous les soirs à 20:00 vers
`J:\Appli-Tazrim\backup\` avec un horodatage, et les
sauvegardes de plus de 30 jours sont automatiquement purgées.

## Installation (1 seule fois — **PAS en admin**)

⚠️ **Ne pas faire "Exécuter en tant qu'administrateur"** sur ce script. Quand
Windows élève en admin, il utilise un autre token utilisateur qui **ne voit
PAS** les disques mappés par GPO (comme J:). Le script détecterait que J:
n'est pas accessible et refuserait de continuer.

1. Ouvre `C:\Cashflow\backend\`
2. **Double-clique sur `install-backup.bat`** (sans clic droit, sans admin)
3. Vérifie les messages :
   - `[OK] J: accessible.`
   - `[OK] Dossier J:\Appli-Tazrim\backup créé.`
   - `[OK] Tâche "CashflowBackup" créée.`
4. Une **sauvegarde de test** est lancée immédiatement. Vérifie que tu vois bien un fichier `data-AAAAMMJJ-HHMMSS.json` dans `J:\Appli-Tazrim\backup\`.

> Note : la création de tâche planifiée pour ton propre compte ne nécessite
> pas de droits administrateur. C'est différent de l'autostart du serveur
> (qui tourne sous SYSTEM et a besoin d'admin pour l'installation).

## Comment ça marche

- Tâche planifiée Windows `CashflowBackup`, **tous les jours à 20:00**
- Tourne sous **TON compte utilisateur** (pas SYSTEM) — sinon J: n'est pas mappé
- Option `/IT` : ne se déclenche que **si tu es connecté à Windows**
- Source : `C:\Cashflow\backend\data.json`
- Destination : `J:\Appli-Tazrim\backup\data-AAAAMMJJ-HHMMSS.json`
- Rétention : **30 derniers jours**, les plus anciens sont supprimés
- Logs : `C:\Cashflow\backend\backup.log`

## Important — tu dois être connecté à 20:00

À cause de l'option `/IT`, la sauvegarde ne se déclenche que si une session
RDP est ouverte sous ton compte à 20:00. Sur un Terminal Server, c'est
généralement le cas (tu laisses ta session ouverte). Si tu te déconnectes
le soir, la sauvegarde du jour sera sautée.

### Pour avoir une sauvegarde sans être connecté

Deux options :

#### Option A — Changer l'heure de sauvegarde

Si tu te déconnectes le soir mais te reconnectes le matin, change l'heure
pour 9:00 par exemple :

```cmd
schtasks /Change /TN CashflowBackup /ST 09:00
```

#### Option B — Utiliser le chemin UNC + compte SYSTEM

Si tu connais le chemin UNC du partage J: (genre `\\srv-fichiers\dossier`),
on peut faire tourner la sauvegarde sous SYSTEM (qui n'a pas besoin de
session). Crée un fichier `.env.backup` dans `backend\` :

```
DEST=\\srv-fichiers\partage\Appli-Tazrim\backup
```

Puis modifie la tâche pour tourner sous SYSTEM (demande-moi le script si tu
veux ça).

## Tester / vérifier

### Lancer une sauvegarde maintenant

```cmd
schtasks /Run /TN CashflowBackup
```

ou simplement double-cliquer sur `backup.bat`.

### Voir le journal

Ouvre `C:\Cashflow\backend\backup.log` — tu verras une ligne par
sauvegarde avec l'horodatage et le statut.

### Lister les sauvegardes existantes

```cmd
dir /O-N J:\Appli-Tazrim\backup\data-*.json
```

(les plus récentes en premier)

## Restaurer une sauvegarde

Si tu dois revenir à une version antérieure :

1. **Arrête le serveur** : ouvre une cmd en admin et tape
   ```cmd
   schtasks /End /TN CashflowBackend
   taskkill /IM node.exe /F
   ```
2. **Renomme l'actuel** (sécurité) :
   ```cmd
   ren C:\Cashflow\backend\data.json data.json.before-restore
   ```
3. **Copie la sauvegarde voulue** :
   ```cmd
   copy J:\Appli-Tazrim\backup\data-20260315-200001.json C:\Cashflow\backend\data.json
   ```
4. **Redémarre le serveur** :
   ```cmd
   schtasks /Run /TN CashflowBackend
   ```
5. Vérifie sur `http://localhost:3000/` que les bonnes données sont là
6. Si tout est OK, supprime `data.json.before-restore`

## Désinstallation

**Clic droit sur `uninstall-backup.bat`** -> **Exécuter en tant qu'administrateur**.

Les sauvegardes déjà sur J: sont conservées (à toi de les supprimer si tu
n'en veux plus).

## Sauvegarder ailleurs / plus souvent

### Changer la destination

Crée `C:\Cashflow\backend\.env.backup` avec :

```
DEST=D:\Mes-Backups\Cashflow
```

Pas besoin de réinstaller la tâche, le fichier est lu à chaque exécution.

### Changer la fréquence

```cmd
REM toutes les heures
schtasks /Change /TN CashflowBackup /SC HOURLY /MO 1

REM 2 fois par jour (12:00 et 20:00) - il faut 2 taches separees ou
REM une seule avec plusieurs declencheurs via taskschd.msc

REM seulement les jours ouvres a 18:00
schtasks /Change /TN CashflowBackup /SC WEEKLY /D MON,TUE,WED,THU,FRI /ST 18:00
```

### Changer la rétention

Édite `backup.bat`, ligne :
```
set "KEEP_DAYS=30"
```
Mets le nombre de jours à conserver.
