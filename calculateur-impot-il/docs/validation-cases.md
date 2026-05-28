# Cas de validation de référence

Objectif : recouper les calculs de l'application avec les simulateurs officiels
de רשות המסים (https://www.misim.gov.il) et ביטוח לאומי
(https://b2b.btl.gov.il/btlcalculators/).

## Impôt sur le revenu (tranches)

Les attendus ci-dessous sont **calculés à la main** à partir des barèmes
annuels et reproduits dans `src/__tests__/unit/brackets.test.ts`. La colonne
« Officiel » reste à compléter après passage dans le simulateur misim.gov.il.

| Année | Revenu imposable (₪) | Impôt calculé (₪) | Officiel (₪) | Statut |
|---|---|---|---|---|
| 2022 | 50 000 | 5 000,0 | _à confirmer_ | calculé |
| 2022 | 100 000 | 10 904,0 | _à confirmer_ | calculé |
| 2022 | 200 000 | 32 662,4 | _à confirmer_ | calculé |
| 2022 | 300 000 | 65 764,8 | _à confirmer_ | calculé |
| 2022 | 600 000 | 180 974,4 | _à confirmer_ | calculé |
| 2023 | 100 000 | 10 740,8 | _à confirmer_ | calculé |
| 2023 | 150 000 | 19 735,2 | _à confirmer_ | calculé |
| 2023 | 250 000 | 46 616,8 | _à confirmer_ | calculé |
| 2023 | 400 000 | 98 696,0 | _à confirmer_ | calculé |
| 2023 | 700 000 | 222 688,4 | _à confirmer_ | calculé |
| 2024 | 100 000 | 10 635,2 | _à confirmer_ | calculé |
| 2024 | 200 000 | 30 074,0 | _à confirmer_ | calculé |
| 2024 | 300 000 | 62 302,8 | _à confirmer_ | calculé |
| 2024 | 500 000 | 132 302,8 | _à confirmer_ | calculé |
| 2024 | 800 000 | 268 422,4 | _à confirmer_ | calculé |
| 2025 | 100 000 | 10 635,2 | _à confirmer_ | calculé (barème = 2024) |
| 2025 | 200 000 | 30 074,0 | _à confirmer_ | calculé (barème = 2024) |
| 2025 | 300 000 | 62 302,8 | _à confirmer_ | calculé (barème = 2024) |
| 2025 | 500 000 | 132 302,8 | _à confirmer_ | calculé (barème = 2024) |
| 2025 | 800 000 | 268 422,4 | _à confirmer_ | calculé (barème = 2024) |

> Note : ces montants correspondent à l'impôt **avant** crédit de points de
> zikui. Pour comparer au simulateur officiel, retrancher
> `points × valeur_du_point` (ex. 2025 : 2 976 ₪/point).

## À ajouter au fil des modules

- Bituah Leumi + Briout : salarié vs indépendant, sous/au-dessus du seuil.
- Eshel : pays standard vs pays majoré (+25%).
- Pension obligatoire indépendants.
- Workflow complet (orchestrateur) : revenu USD → total mensuel.
