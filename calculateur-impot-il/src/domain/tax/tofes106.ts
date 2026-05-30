/**
 * Module Tax — calcul de l'impôt à partir d'un טופס 106 (salarié).
 *
 * Le Tofes 106 récapitule, pour une année, le salaire imposable et l'impôt
 * effectivement retenu (case 042). Ce module reconstitue la case 042 à partir
 * des champs saisis afin de vérifier / coller au montant officiel :
 *
 *   revenu imposable = salaire imposable (158) − déductions (קופת גמל, etc.)
 *   impôt brut       = barème progressif(revenu imposable) + מס יסף
 *   case 042 ≈ impôt brut − (points × valeur du point)
 *
 * La valeur du point peut être forcée (ex. travailleur étranger : 1 point
 * vaut un montant différent du barème résident).
 */
import type { TaxRules } from '@/types';
import { computeProgressiveTax } from '@/domain/tax/brackets';
import { computeSurtax, type SurtaxResult } from '@/domain/tax/surtax';
import { computePointsCredit } from '@/domain/tax/points';
import type { TaxResult } from '@/types';

export interface Tofes106Input {
  /** Case 158 — סה"כ שכר חייב (salaire brut imposable annuel). */
  taxableSalary: number;
  /**
   * Déductions du revenu imposable (קופת גמל / השתלמות / etc.) qui réduisent
   * l'assiette de l'impôt sur le revenu. Somme en ₪.
   */
  deductions: number;
  /** Nombre de points de crédit (case נקודות זיכוי). */
  points: number;
  /**
   * Valeur du point en ₪. Pour un travailleur étranger ou un cas particulier,
   * saisir la valeur réelle lue sur le 106 (ex. 2 178). Sinon valeur officielle.
   */
  pointValue: number;
  /** Crédits d'impôt supplémentaires (זיכויים) déduits directement de l'impôt. */
  extraCredits: number;
}

export interface Tofes106Result {
  /** Revenu imposable retenu = salaire − déductions. */
  taxableIncome: number;
  /** Détail du barème progressif. */
  incomeTax: TaxResult;
  /** Surtaxe hauts revenus (מס יסף). */
  surtax: SurtaxResult;
  /** Crédit de points = points × valeur du point. */
  pointsCredit: number;
  /** Crédits supplémentaires appliqués. */
  extraCredits: number;
  /** Impôt calculé (≈ case 042), jamais négatif. */
  computedTax042: number;
}

const safe = (n: number): number => (Number.isFinite(n) ? Math.max(0, n) : 0);

/** Reconstitue la case 042 à partir d'un Tofes 106. */
export function computeTofes106(input: Tofes106Input, rules: TaxRules): Tofes106Result {
  const taxableIncome = Math.max(0, safe(input.taxableSalary) - safe(input.deductions));

  const incomeTax = computeProgressiveTax(taxableIncome, rules.brackets);
  const surtax = computeSurtax(taxableIncome, rules.surtax);
  const pointsCredit = computePointsCredit(safe(input.points), safe(input.pointValue));
  const extraCredits = safe(input.extraCredits);

  const computedTax042 = Math.max(
    0,
    incomeTax.totalTax + surtax.amount - pointsCredit - extraCredits,
  );

  return {
    taxableIncome,
    incomeTax,
    surtax,
    pointsCredit,
    extraCredits,
    computedTax042,
  };
}
