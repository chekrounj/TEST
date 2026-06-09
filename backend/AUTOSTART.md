# Démarrage automatique au login Windows

Le serveur cashflow démarre tout seul à chaque ouverture de session
Windows et tourne en arrière-plan (pas de fenêtre noire qui traîne).

## Installation (une seule fois)

1. Ouvre le dossier `backend\` (ex. `J:\Appli TAZRIM\backend\`).
2. **Double-clique sur `install-autostart.bat`**.
3. Réponds `O` quand on te propose de démarrer le serveur maintenant.
4. C'est fait. Ferme la fenêtre.

À partir de maintenant, à chaque fois que tu allumes ton PC ou que tu te
reconnectes à Windows, le serveur cashflow se lancera tout seul, sans rien
afficher.

## Utiliser l'app au quotidien

Le serveur tourne en arrière-plan, donc il ne s'ouvre PAS tout seul dans le
navigateur (sinon ça popperait à chaque allumage du PC).

Pour ouvrir l'app, deux options :

- **Option A — Raccourci bureau** : copie `Ouvrir-Cashflow.bat` sur ton bureau,
  et double-clique dessus pour ouvrir l'appli dans ton navigateur.
- **Option B — Favori navigateur** : ajoute `http://localhost:3000/` dans les
  favoris de Chrome / Edge / Firefox.

## Vérifier que le serveur tourne

Va dans le navigateur sur :

```
http://localhost:3000/api/health
```

Tu dois voir quelque chose comme `{"ok":true,"version":"0.3.0",...}`.

Si tu vois "Impossible d'accéder à ce site" → le serveur n'est pas lancé
(voir « Dépannage » plus bas).

## Désinstaller le démarrage automatique

Double-clique sur `uninstall-autostart.bat`. Le serveur ne se lancera plus
tout seul. Tu peux toujours le lancer à la main avec `start.bat`.

## Dépannage

### « Impossible d'accéder à ce site » sur http://localhost:3000

Le serveur ne tourne pas. Causes possibles :

1. **Tu n'as pas redémarré ton PC depuis l'installation.** Soit redémarre,
   soit relance `start.bat` manuellement (le serveur démarrera et restera en
   tâche au prochain login).
2. **Le port 3000 est utilisé par un autre programme.** Ouvre `cmd` et tape :
   ```
   netstat -ano | findstr :3000
   ```
   Si tu vois une ligne, repère le `PID` (dernière colonne), va dans le
   Gestionnaire des tâches → Détails → trie par PID → trouve et arrête le
   processus.
3. **Le serveur a planté au démarrage.** Lance `start.bat` à la main : tu
   verras le message d'erreur dans la fenêtre noire. Copie-le pour
   diagnostic.

### Arrêter le serveur en cours

Ouvre le Gestionnaire des tâches (Ctrl+Maj+Échap), onglet **Détails**,
trouve `node.exe`, clic droit → **Fin de tâche**.

### Le serveur s'est mis à jour, comment relancer ?

1. Ouvre le Gestionnaire des tâches → arrête `node.exe`.
2. Double-clique sur `start.bat` (pour vérifier que le démarrage marche).
3. Ferme la fenêtre noire.
4. Au prochain login Windows, la version à jour démarrera toute seule.

### Le serveur tourne mais l'app affiche des données vieilles

Le navigateur a peut-être un cache. Force le rechargement :
- Chrome / Edge / Firefox : **Ctrl+Maj+R** (ou Ctrl+F5).

### Voir si la tâche planifiée est bien installée

Tape `Win+R`, puis `taskschd.msc`. Dans la **Bibliothèque du Planificateur de
tâches**, cherche `CashflowBackend`. Tu peux voir l'historique des
exécutions, l'activer/désactiver, etc.

## Sauvegardes

Les données sont dans `backend\data.json`. **Ce fichier est le seul à
sauvegarder.** Copie-le régulièrement sur une clé USB ou un disque externe.

Pour automatiser : crée une tâche planifiée qui copie `data.json` chaque
jour à 20h vers un dossier de backup. Demande-moi si tu veux le script.
