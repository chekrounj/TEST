/**
 * Chargement des règles fiscales par année.
 *
 * Les données sont externalisées dans `src/data/tax-rules-{year}.json` afin
 * que la logique métier reste indépendante des valeurs (cf. note de
 * maintenance : mise à jour annuelle obligatoire en janvier).
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

/** Années fiscales pour lesquelles des règles sont disponibles. */
export const AVAILABLE_YEARS: number[] = Object.keys(RULES_BY_YEAR)
  .map(Number)
  .sort((a, b) => a - b);

/**
 * Renvoie les règles fiscales d'une année donnée.
 * @throws si l'année n'est pas supportée.
 */
export function getTaxRules(year: number): TaxRules {
  const rules = RULES_BY_YEAR[year];
  if (!rules) {
    throw new Error(
      `Aucune règle fiscale disponible pour l'année ${year}. ` +
        `Années supportées : ${AVAILABLE_YEARS.join(', ')}.`,
    );
  }
  return rules;
}
