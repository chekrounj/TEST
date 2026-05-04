# TimeTrack — Suivi des heures

Application web (HTML / CSS / JS) permettant aux employés de saisir leurs heures
de travail par tâche, projet et client, avec rapprochement automatique avec
les heures de présence importées depuis Excel.

## Fonctionnalités

- **Saisie des heures** par tâche / projet / client avec contrôle de cohérence
  par rapport aux heures de présence (tolérance configurable, mode jour ou
  semaine, message d'avertissement ou blocage selon paramètre).
- **Catalogue importable** : clients, projets, tâches, employés (import Excel
  `.xlsx` / `.xls` / `.csv` avec modèles téléchargeables).
- **Présences** : saisie manuelle ou import Excel des heures de présence
  des employés (fait correspondre par matricule ou par nom).
- **Conciliation présences ⇄ saisies** : tableau croisé jour par jour avec
  badge OK / léger écart / hors tolérance.
- **Assignation de tâches** aux employés avec date de réalisation prévue,
  niveau d'urgence (Urgent / Normal), heures estimées et statut
  (En attente / En cours / Achevée).
- **Rapports** : tâches en attente, tâches achevées, temps de traitement par
  tâche, heures par employé, export Excel multi-feuilles.
- **Tableau de bord** moderne : KPI, courbe des heures sur 7 jours, donut
  par projet, tâches urgentes, activité récente.
- **Paramètres** : tolérance d'écart, mode de comparaison, heures
  journalières par défaut, comportement hors tolérance (avertir ou bloquer),
  export / import JSON et reset.

## Démarrage

Aucune installation requise. Ouvrir `index.html` dans un navigateur récent,
ou servir le dossier statiquement :

```
python3 -m http.server 8000
# puis http://localhost:8000
```

Cliquez sur **Données d'exemple** dans la barre supérieure pour pré-remplir
l'application avec des clients, projets, tâches, employés, assignations,
saisies et présences.

## Modèles d'import (colonnes attendues)

| Fichier | Colonnes |
|---|---|
| Clients | Nom, Code, Contact, Email |
| Projets | Nom, Client, Code, Statut |
| Tâches | Nom, Projet, Code, Heures estimees |
| Employés | Nom, Matricule, Email, Service |
| Présences | Employe, Matricule, Date, Heures |

Les libellés sont insensibles à la casse et aux accents courants. Les heures
acceptent les formats `8`, `8.5`, `8,5` ou `8h30`. Les dates acceptent
`yyyy-mm-dd`, `dd/mm/yyyy`, `dd-mm-yyyy`.

## Stockage

Toutes les données sont stockées localement dans `localStorage` du navigateur.
Pour une utilisation multi-utilisateurs persistante, brancher l'application
sur une API backend (les structures sont déjà cohérentes JSON).

## Pile technique

- HTML / CSS / JavaScript (aucune build step)
- [SheetJS / xlsx](https://sheetjs.com) (import / export Excel)
- [Chart.js](https://www.chartjs.org) (graphiques)
