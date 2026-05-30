/**
 * Module Tax — calcul progressif de l'impôt sur le revenu israélien.
 *
 * Les tranches (`Bracket[]`) sont **annuelles** (jamais mensuelles) et sont
 * chargées depuis `src/data/tax-rules-{year}.json`. Le calcul applique chaque
 * taux marginal uniquement à la portion de revenu comprise dans la tranche,
 * et renvoie toujours un `breakdown` détaillé pour un affichage transparent.
 *
 * Référence : barèmes publiés par רשות המסים
 *   https://www.gov.il/he/departments/topics/income_tax_rates
 */
import type { Bracket, TaxResult } from '@/types';

/**
 * Calcule l'impôt sur le revenu progressif pour un revenu imposable annuel.
 *
 * @param taxableIncome Revenu imposable annuel en ILS (les valeurs négatives
 *   sont traitées comme 0).
 * @param brackets Tranches annuelles ordonnées par plafond croissant. La
 *   dernière tranche doit avoir `limit === null` (pas de plafond).
 * @returns L'impôt total et le détail tranche par tranche.
 */
export function computeProgressiveTax(
  taxableIncome: number,
  brackets: Bracket[],
): TaxResult {
  const income = Number.isFinite(taxableIncome) ? Math.max(0, taxableIncome) : 0;

  const breakdown: TaxResult['breakdown'] = [];
  let totalTax = 0;
  let lowerBound = 0;

  for (const bracket of brackets) {
    if (income <= lowerBound) break;

    const upperBound = bracket.limit ?? Infinity;
    // Portion du revenu effectivement taxée dans cette tranche.
    const taxedAmount = Math.min(income, upperBound) - lowerBound;

    if (taxedAmount > 0) {
      const tax = taxedAmount * bracket.rate;
      totalTax += tax;
      breakdown.push({
        from: lowerBound,
        to: Math.min(income, upperBound),
        rate: bracket.rate,
        taxedAmount,
        tax,
      });
    }

    lowerBound = upperBound;
  }

  return { totalTax, breakdown };
}
