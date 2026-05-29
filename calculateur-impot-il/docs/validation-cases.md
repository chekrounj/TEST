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

## Bituah Leumi + Briout (2025)

Config 2025 : seuil annuel 90 264 ₪ (7 522 ₪/mois) · plafond annuel 588 360 ₪
(49 030 ₪/mois). Attendus calculés à la main, reproduits dans
`src/__tests__/unit/bituah.test.ts`. Colonne « Officiel » à compléter via le
simulateur ביטוח לאומי (https://b2b.btl.gov.il/btlcalculators/).

| Statut | Revenu annuel (₪) | Leumi (₪) | Briout (₪) | Total (₪) | 52% déductible (₪) |
|---|---|---|---|---|---|
| Salarié | 60 000 | 240,00 | 1 860,00 | 2 100,00 | — |
| Salarié | 120 000 | 2 442,58 | 4 284,98 | 6 727,56 | — |
| Indép. | 120 000 | 6 405,71 | 4 284,98 | 10 690,69 | 3 330,97 |
| Indép. | 700 000 | 66 496,29 | 27 702,98 | 94 199,28 | 34 578,07 |

> Limitations connues à lever ultérieurement : cotisation **minimale** des
> indépendants à faible revenu non modélisée ; pas de distinction des taux
> applicables aux revenus passifs.

## À ajouter au fil des modules

- Eshel : pays standard vs pays majoré (+25%).
- Pension obligatoire indépendants.
- Workflow complet (orchestrateur) : revenu USD → total mensuel.
