/**
 * Module Eshel — pays « chers » majorés de +25%.
 *
 * Liste issue des תקנות מס הכנסה (ניכוי הוצאות מסוימות), תשל"ב-1972.
 * À revoir si publication d'un nouvel arrêté ministériel.
 *
 * NB : liste à confirmer sur l'annexe officielle à jour
 * (statut `approximate-pending-regulation-check` dans les JSON).
 */

/** Pays bénéficiant de la majoration eshel +25% (clés canoniques). */
export const EXPENSIVE_COUNTRIES = [
  'USA',
  'UK',
  'Suisse',
  'Japon',
  'Australie',
  'Canada',
  'Suède',
  'Norvège',
  'Danemark',
  'Islande',
  'Irlande',
  'Finlande',
  'Luxembourg',
] as const;

/** Liste de pays proposés dans l'interface (libellé FR + majoration). */
export const COUNTRIES: Array<{ name: string; expensive: boolean }> = [
  { name: 'Israël', expensive: false },
  { name: 'France', expensive: false },
  { name: 'USA', expensive: true },
  { name: 'UK', expensive: true },
  { name: 'Suisse', expensive: true },
  { name: 'Japon', expensive: true },
  { name: 'Australie', expensive: true },
  { name: 'Canada', expensive: true },
  { name: 'Suède', expensive: true },
  { name: 'Norvège', expensive: true },
  { name: 'Danemark', expensive: true },
  { name: 'Islande', expensive: true },
  { name: 'Irlande', expensive: true },
  { name: 'Finlande', expensive: true },
  { name: 'Luxembourg', expensive: true },
  { name: 'Allemagne', expensive: false },
  { name: 'Italie', expensive: false },
  { name: 'Espagne', expensive: false },
  { name: 'Belgique', expensive: false },
  { name: 'Pays-Bas', expensive: false },
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
