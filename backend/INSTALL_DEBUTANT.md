# Installation pas à pas (Windows, débutant)

> Suivez chaque étape dans l'ordre. **Ne sautez pas d'étape.** À la fin vous aurez votre app qui tourne sur `http://localhost:3000` avec toutes vos données stockées sur votre PC.

---

## Étape 1 — Vérifier que Node.js est installé

1. Cliquez sur le bouton **Démarrer** de Windows (en bas à gauche).
2. Tapez `cmd` au clavier puis appuyez sur **Entrée**.
3. Une fenêtre noire s'ouvre. Tapez exactement :

   ```
   node --version
   ```

4. Appuyez sur **Entrée**.

### Si vous voyez quelque chose comme `v22.11.0`

✅ Node.js est installé. Allez à l'**étape 3**.

### Si vous voyez `'node' n'est pas reconnu...`

Node.js n'est pas installé. Allez à l'**étape 2**.

---

## Étape 2 — Installer Node.js (si nécessaire)

1. Ouvrez https://nodejs.org/fr dans votre navigateur.
2. Cliquez sur le **gros bouton vert de gauche** intitulé **LTS** (Long Term Support).
3. Un fichier `.msi` se télécharge (~30 Mo).
4. Une fois téléchargé, **double-cliquez** dessus.
5. Cliquez sur **Suivant** à chaque étape sans rien changer. Au moment où Windows demande l'autorisation, cliquez **Oui**.
6. À la fin, cliquez sur **Terminer**.
7. **Fermez la fenêtre cmd** si elle est encore ouverte.

> Important : Node.js n'est visible qu'après avoir ouvert une **nouvelle** fenêtre cmd. Sinon l'ancienne ne sait pas qu'il existe.

8. Ouvrez à nouveau **Démarrer → cmd → Entrée**, et tapez :

   ```
   node --version
   ```

   Vous devez maintenant voir `v22.x.x`. Si oui, continuez.

---

## Étape 3 — Vérifier que vous avez le code complet

Le projet contient **deux choses** :

- `cashflow.html` (l'application elle-même)
- `backend\` (le dossier serveur, avec dedans `start.bat`, `server.js`, etc.)

L'arborescence doit ressembler à ça :

```
J:\Appli TAZRIM\
├── cashflow.html           ← le fichier de l'app
└── backend\
    ├── start.bat           ← le bouton à double-cliquer
    ├── server.js
    ├── package.json
    └── (autres fichiers)
```

### Comment vérifier

1. Ouvrez l'**Explorateur de fichiers** Windows.
2. Allez dans `J:\Appli TAZRIM\` (ou là où vous avez mis le projet).
3. Vous devez voir :
   - Un fichier `cashflow.html`
   - Un dossier `backend`

### Si `cashflow.html` manque

Téléchargez à nouveau le projet complet. Soit via Git, soit en téléchargeant le ZIP depuis le repo et en l'extrayant tout entier.

### Si vous n'avez que `backend\`

Pareil : il manque la moitié du projet. Téléchargez tout.

---

## Étape 4 — Lancer le serveur la première fois

1. Ouvrez l'**Explorateur de fichiers**.
2. Allez dans `J:\Appli TAZRIM\backend\`.
3. **Double-cliquez** sur `start.bat`.

### Ce que vous devez voir

Une fenêtre noire s'ouvre. Au début c'est rapide, puis ça affiche :

```
=== Cashflow - serveur local ===

[OK] Node.js v22.x.x

Installation des dependances (~30s, peut prendre quelques minutes)...
```

Puis ça écrit beaucoup de choses pendant **30 secondes à 3 minutes** (la première fois seulement, c'est l'installation des composants nécessaires).

À la fin vous devez lire :

```
added 139 packages, and audited 140 packages in XXs

Generation du fichier .env...
[OK] .env cree.

Lancement du serveur sur http://localhost:3000
Le navigateur s'ouvrira quand le serveur sera pret.
Fermer cette fenetre (ou Ctrl+C) pour arreter.

[cashflow-backend] ▶ http://localhost:3000
[cashflow-backend] cashflow.html : OK
```

**Votre navigateur s'ouvre automatiquement** sur l'app.

### Si la fenêtre se referme tout de suite ou affiche une erreur

Lisez la dernière ligne de la fenêtre noire — elle dit quoi corriger. Si ce n'est pas clair, copiez les 10 dernières lignes et envoyez-les.

---

## Étape 5 — Première utilisation de l'app

1. Le navigateur affiche **Cashflow · Pilotage trésorerie cabinet** en haut.
2. Pour que vos données soient sauvegardées en permanence, **cliquez sur « Se connecter »** en haut à droite.
3. Une fenêtre s'ouvre.
4. En bas, dans le bloc **« Login de développement »** (le mode local), tapez n'importe quel email (ex. `vous@cabinet.local`).
5. Cliquez **Login dev**.
6. La page recharge.
7. À droite du logo « Cashflow » vous voyez maintenant votre email + une icône nuage verte → vos données sont sauvegardées dans `backend\data.db` automatiquement après chaque modification.

---

## Étape 6 — Arrêter et relancer

### Pour arrêter le serveur

Fermez simplement la **fenêtre noire** qui s'est ouverte au démarrage. L'app dans le navigateur cesse de sauvegarder ; vous pouvez aussi fermer l'onglet.

### Pour relancer plus tard

Double-cliquez sur **`start.bat`**. Cette fois c'est instantané (les composants sont déjà installés). Le navigateur s'ouvre tout seul, vous êtes déjà connecté.

---

## Étape 7 (option) — Démarrage automatique au login Windows

Si vous voulez que le serveur démarre tout seul à chaque allumage de PC :

1. **Win + R** → tapez `shell:startup` → Entrée.
2. L'Explorateur ouvre un dossier spécial Windows.
3. Faites un **clic droit** sur `start.bat` (dans `backend\`) → **Copier**.
4. Dans le dossier qui vient de s'ouvrir, **clic droit → Coller le raccourci** (pas « Coller » tout court).
5. À chaque fois que vous allumez Windows, le serveur démarre en arrière-plan.

---

## Sauvegarder vos données

**Tout** est dans le fichier `backend\data.json` (depuis la v0.3.0 — auparavant c'était `data.db`). Pour sauvegarder :

- Copiez ce fichier sur un disque externe / OneDrive / Dropbox de temps en temps.
- OU dans l'app : **Données → Sauvegarder (JSON)** → un fichier `.json` se télécharge, vous pouvez le mettre où vous voulez.

Pour restaurer plus tard : **Données → Restaurer (JSON)** (export/import via l'app), ou simplement recopier `data.json` à sa place.

---

## Problèmes fréquents

| Vous voyez | Ce qui se passe | Solution |
|---|---|---|
| La fenêtre noire se ferme immédiatement | Une erreur fatale juste après le lancement | Ouvrez cmd manuellement (Démarrer → cmd), tapez `cd /d "J:\Appli TAZRIM\backend"` puis `start.bat`. La fenêtre reste ouverte, vous voyez l'erreur. |
| `'node' n'est pas reconnu` | Node.js n'est pas dans le PATH | Refermez TOUTES les fenêtres cmd, ouvrez-en une nouvelle, retentez. Si ça ne marche toujours pas, réinstaller Node.js. |
| `npm install a echoue` | Antivirus / pas d'internet / proxy d'entreprise | Désactiver l'antivirus 2 min le temps de l'install, OU passer en partage de connexion mobile. |
| `gyp ERR! find Python` ou erreur Visual Studio | Vous avez une version ancienne du backend (pre-0.3.0) qui essaie de compiler SQLite | Récupérer la dernière version. Depuis la 0.3.0 plus de compilation native, plus besoin de Python ni Visual Studio. |
| `port 3000 already in use` | Un autre programme utilise le port 3000 | Ouvrir `backend\.env` dans le bloc-notes, remplacer `PORT=3000` par `PORT=3001`. Puis relancer `start.bat`. L'app sera sur http://localhost:3001 |
| Le navigateur s'ouvre mais blanc | Vous avez ouvert la page **avant** que le serveur ne soit prêt | Attendez que la fenêtre noire affiche `▶ http://localhost:3000`, puis rafraîchissez la page (F5) |
| `Cannot find package 'express'` | `node_modules` est corrompu | Dans cmd : `cd /d "J:\Appli TAZRIM\backend"` puis `rd /s /q node_modules` puis `del package-lock.json` puis `npm install` |

---

## Comment savoir quelle version vous avez

Une fois le serveur lancé, ouvrez dans le navigateur :
- http://localhost:3000/api/health → doit afficher `"version":"0.2.0"` (ou plus récent)
- http://localhost:3000/api/version → affiche aussi le détail du fichier `cashflow.html`

Si la version n'est pas celle attendue, c'est que vous avez encore un ancien code. Téléchargez-le à nouveau.
