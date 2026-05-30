/**
 * Module Tax — surtaxe sur les hauts revenus (מס יסף, art. 121ב).
 *
 * Un taux additionnel (3% en 2022-2025) frappe la part du revenu imposable
 * annuel qui dépasse un seuil annuel (gelé à 721 560 ₪ pour 2024-2025).
 *
 * Référence : הוראת ביצוע מס יסף, רשות המסים.
 */
import type { SurtaxRules, SurtaxResult } from '@/types';

export type { SurtaxResult };

/**
 * Calcule la surtaxe מס יסף sur un revenu imposable annuel.
 * Renvoie un résultat à 0 si aucune règle n'est fournie (rétro-compat).
 */
export function computeSurtax(
  taxableIncome: number,
  surtax: SurtaxRules | undefined,
): SurtaxResult {
  const income = Number.isFinite(taxableIncome) ? Math.max(0, taxableIncome) : 0;
  if (!surtax || surtax.rate <= 0 || surtax.threshold < 0) {
    return { amount: 0, taxedAmount: 0, threshold: surtax?.threshold ?? 0, rate: surtax?.rate ?? 0 };
  }
  const taxedAmount = Math.max(0, income - surtax.threshold);
  return {
    amount: taxedAmount * surtax.rate,
    taxedAmount,
    threshold: surtax.threshold,
    rate: surtax.rate,
  };
}
