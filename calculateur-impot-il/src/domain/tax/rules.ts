/**
 * Chargement des règles fiscales par année.
 *
 * Les données sont externalisées dans `src/data/tax-rules-{year}.json` afin
 * que la logique métier reste indépendante des valeurs (cf. note de
 * maintenance : mise à jour annuelle obligatoire en janvier).
 *
 * Année en cours sans données : si aucune règle n'existe encore pour une année
 * (typiquement l'année civile en cours, avant publication officielle), on
 * retombe sur les tranches de l'année précédente disponible (barème
 * « provisoire »). Le change de repli suit la même logique (valeur connue la
 * plus récente).
 */
import type { TaxRules } from '@/types';

import rules2022 from '@/data/tax-rules-2022.json';
import rules2023 from '@/data/tax-rules-2023.json';
import rules2024 from '@/data/tax-rules-2024.json';
import rules2025 from '@/data/tax-rules-2025.json';

const RULES_BY_YEAR: Record<number, TaxRules> = {
  2022: rules2022 as TaxRules,
  2023: rules2023 as TaxRules,
  2024: rules2024 as TaxRules,
  2025: rules2025 as TaxRules,
};

/** Années pour lesquelles un fichier de données réel existe. */
export const DATA_YEARS: number[] = Object.keys(RULES_BY_YEAR)
  .map(Number)
  .sort((a, b) => a - b);

/** Conservé pour compatibilité : années disposant de données réelles. */
export const AVAILABLE_YEARS: number[] = DATA_YEARS;

const MIN_DATA_YEAR = DATA_YEARS[0];
const MAX_DATA_YEAR = DATA_YEARS[DATA_YEARS.length - 1];

/**
 * Années sélectionnables dans l'UI : les années avec données + les années
 * « provisoires » jusqu'à l'année civile en cours (barème de l'année
 * précédente en attendant la publication officielle).
 */
export const SELECTABLE_YEARS: number[] = (() => {
  const currentYear = new Date().getFullYear();
  const years = [...DATA_YEARS];
  for (let y = MAX_DATA_YEAR + 1; y <= currentYear; y++) years.push(y);
  return years;
})();

/** Vrai si l'année n'a pas de données propres (barème emprunté à N-1). */
export function isProvisionalYear(year: number): boolean {
  return !RULES_BY_YEAR[year] && year > MAX_DATA_YEAR;
}

/**
 * Résout une année demandée vers l'année de données à utiliser réellement.
 * - année avec données : elle-même
 * - année > dernière année connue : la dernière année connue (barème N-1…)
 * @throws si l'année est antérieure à la première année connue.
 */
export function resolveDataYear(year: number): number {
  if (RULES_BY_YEAR[year]) return year;
  if (year > MAX_DATA_YEAR) return MAX_DATA_YEAR;
  throw new Error(
    `Aucune règle fiscale disponible pour l'année ${year}. ` +
      `Première année supportée : ${MIN_DATA_YEAR}.`,
  );
}

/**
 * Renvoie les règles fiscales d'une année donnée. Pour une année provisoire
 * (sans données), renvoie les règles de la dernière année connue.
 * @throws si l'année est antérieure aux données disponibles.
 */
export function getTaxRules(year: number): TaxRules {
  return RULES_BY_YEAR[resolveDataYear(year)];
}
