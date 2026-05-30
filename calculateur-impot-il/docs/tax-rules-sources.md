# Sources officielles des règles fiscales

Chaque fichier `src/data/tax-rules-{year}.json` porte un champ `lastVerified` et
un champ `verificationStatus` par bloc. Vérifier et mettre à jour **chaque année
en janvier**.

| Élément | URL | Format |
|---|---|---|
| Tranches d'impôt | https://www.gov.il/he/departments/topics/income_tax_rates | HTML annuel |
| Valeur du point de crédit | https://www.gov.il/he/departments/policies/credit_points_value | HTML annuel |
| Bituah Leumi (taux) | https://www.btl.gov.il/Insurance/Pages/default.aspx | HTML |
| תקנות מס הכנסה (ניכוי הוצאות מסוימות), תשל"ב-1972 | https://www.nevo.co.il/law_html/Law01/137_001.htm | Texte de loi |
| Salaire moyen national | https://www.cbs.gov.il/he/subjects/Pages/שכר.aspx | XLSX trimestriel |
| Liste pays eshel majorés (+25%) | תקנות מס הכנסה — annexe | PDF |
| Taux de change officiels (שערים יציגים) | https://www.boi.org.il/he/economic-and-statistical-data/exchange-rates/ | API JSON |
| Jours fériés / fêtes juives | https://www.hebcal.com/home/195/jewish-calendar-rest-api | API JSON |

## État de vérification actuel

- **Tranches d'impôt 2022–2025** : issues des barèmes annuels publiés. Les
  tranches 2025 sont gelées au niveau 2024 (pas d'indexation).
- **Valeur du point** : 2022 = 2 616 ₪ · 2023 = 2 820 ₪ · 2024 = 2 904 ₪ ·
  2025 = 2 976 ₪ (12 × valeur mensuelle).
- **Bituah / selfPension / eshel / fxFallback** : valeurs indicatives à
  recouper avec les sources officielles ci-dessus avant la mise en production
  (marquées `pending-official-verification` / `approximate` dans le JSON).
