/**
 * Module Eshel — pays « chers » majorés de +25%.
 *
 * Liste issue des תקנות מס הכנסה (ניכוי הוצאות מסוימות), תשל"ב-1972, telle
 * que publiée par les conseillers fiscaux pour 2024-2025 : 28 pays pour
 * lesquels le plafond des frais de séjour/hébergement à l'étranger est
 * majoré de 25% (125%).
 *
 * NB importante : les États-Unis ne figurent PAS dans cette liste (tarif
 * standard), contrairement à une idée répandue. La France, en revanche, EST
 * majorée. À revérifier à chaque publication d'un arrêté mis à jour.
 *
 * Sources :
 *   - https://oritax.co.il/הוצאות-נסיעה-לחול/
 *   - https://www.dnk-cpa.co.il/?item=576&section=23
 *   - https://claltax.com/הוצאות-מוכרות-בחוץ-לארץ/
 */

/** Pays bénéficiant de la majoration eshel +25% (clés canoniques FR). */
export const EXPENSIVE_COUNTRIES = [
  'Allemagne',
  'Angola',
  'Australie',
  'Autriche',
  'Belgique',
  'Cameroun',
  'Canada',
  'Corée du Sud',
  'Danemark',
  'Dubaï',
  'Émirats arabes unis',
  'Espagne',
  'Finlande',
  'France',
  'Grèce',
  'Hong Kong',
  'Irlande',
  'Islande',
  'Italie',
  'Japon',
  'Luxembourg',
  'Norvège',
  'Oman',
  'Pays-Bas',
  'Qatar',
  'Royaume-Uni',
  'UK',
  'Suède',
  'Suisse',
  'Taïwan',
] as const;

/** Liste de pays proposés dans l'interface (libellé FR + majoration). */
export const COUNTRIES: Array<{ name: string; expensive: boolean }> = [
  { name: 'Israël', expensive: false },
  { name: 'USA', expensive: false },
  { name: 'Allemagne', expensive: true },
  { name: 'Angola', expensive: true },
  { name: 'Australie', expensive: true },
  { name: 'Autriche', expensive: true },
  { name: 'Belgique', expensive: true },
  { name: 'Cameroun', expensive: true },
  { name: 'Canada', expensive: true },
  { name: 'Corée du Sud', expensive: true },
  { name: 'Danemark', expensive: true },
  { name: 'Dubaï', expensive: true },
  { name: 'Émirats arabes unis', expensive: true },
  { name: 'Espagne', expensive: true },
  { name: 'Finlande', expensive: true },
  { name: 'France', expensive: true },
  { name: 'Grèce', expensive: true },
  { name: 'Hong Kong', expensive: true },
  { name: 'Irlande', expensive: true },
  { name: 'Islande', expensive: true },
  { name: 'Italie', expensive: true },
  { name: 'Japon', expensive: true },
  { name: 'Luxembourg', expensive: true },
  { name: 'Norvège', expensive: true },
  { name: 'Oman', expensive: true },
  { name: 'Pays-Bas', expensive: true },
  { name: 'Qatar', expensive: true },
  { name: 'Royaume-Uni', expensive: true },
  { name: 'Suède', expensive: true },
  { name: 'Suisse', expensive: true },
  { name: 'Taïwan', expensive: true },
  { name: 'Autre', expensive: false },
];

/** Normalise un nom de pays (minuscules, sans accents ni espaces superflus). */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

const EXPENSIVE_SET = new Set(EXPENSIVE_COUNTRIES.map(normalize));

/** Indique si un pays bénéficie de la majoration eshel +25%. */
export function isExpensiveCountry(country: string): boolean {
  return EXPENSIVE_SET.has(normalize(country));
}
