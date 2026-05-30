/**
 * Module Bituah Leumi — cotisation d'assurance nationale.
 *
 * La cotisation s'applique au revenu annuel découpé en deux paliers :
 *   - portion sous le seuil (60% du salaire moyen) : taux réduit ;
 *   - portion entre le seuil et le plafond (5× le salaire moyen) : taux plein ;
 *   - portion au-dessus du plafond : non cotisée.
 *
 * Pour les indépendants, 52% du Bituah Leumi est déductible du revenu
 * imposable (voir orchestrateur, ligne automatique).
 */
import type { BituahComponent, TaxpayerStatus } from '@/types';
import {
  getBituahAnnualConfig,
  splitIncome,
  type IncomeSplit,
} from '@/domain/bituah/rates';

/** Calcule la cotisation Bituah Leumi annuelle. */
export function computeLeumi(
  annualIncome: number,
  year: number,
  status: TaxpayerStatus,
  split?: IncomeSplit,
): BituahComponent {
  const cfg = getBituahAnnualConfig(year, status);
  const { lowPortion, highPortion } =
    split ?? splitIncome(annualIncome, cfg.thresholdAnnual, cfg.maxAnnual);

  const amount = lowPortion * cfg.leumiLow + highPortion * cfg.leumiHigh;

  return {
    amount,
    lowPortion,
    highPortion,
    rateLow: cfg.leumiLow,
    rateHigh: cfg.leumiHigh,
  };
}
