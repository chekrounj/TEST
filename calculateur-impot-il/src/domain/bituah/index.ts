/**
 * Module Bituah — composition Leumi + Briout.
 *
 * `computeBituah` calcule les deux cotisations sur le même découpage de revenu
 * et renvoie le détail complet (`BituahResult`), y compris la part de Bituah
 * Leumi déductible pour les indépendants (52%).
 */
import type { BituahResult, TaxpayerStatus } from '@/types';
import {
  getBituahAnnualConfig,
  splitIncome,
  SELF_LEUMI_DEDUCTIBLE_RATIO,
} from '@/domain/bituah/rates';
import { computeLeumi } from '@/domain/bituah/leumi';
import { computeBriout } from '@/domain/bituah/briout';

/**
 * Calcule le Bituah Leumi + Briout pour un revenu annuel.
 *
 * @param annualIncome Revenu annuel en ILS (négatif/non fini => 0).
 * @param year Année fiscale.
 * @param status 'employee' (salarié) ou 'self' (indépendant).
 */
export function computeBituah(
  annualIncome: number,
  year: number,
  status: TaxpayerStatus,
): BituahResult {
  const cfg = getBituahAnnualConfig(year, status);
  const split = splitIncome(annualIncome, cfg.thresholdAnnual, cfg.maxAnnual);

  const leumi = computeLeumi(annualIncome, year, status, split);
  const briout = computeBriout(annualIncome, year, status, split);

  const leumiDeductible =
    status === 'self' ? leumi.amount * SELF_LEUMI_DEDUCTIBLE_RATIO : 0;

  return {
    leumi: leumi.amount,
    briout: briout.amount,
    total: leumi.amount + briout.amount,
    leumiDeductible,
    breakdown: {
      thresholdAnnual: cfg.thresholdAnnual,
      maxAnnual: cfg.maxAnnual,
      lowPortion: split.lowPortion,
      highPortion: split.highPortion,
      cappedExcess: split.cappedExcess,
      rates: {
        leumiLow: cfg.leumiLow,
        leumiHigh: cfg.leumiHigh,
        brioutLow: cfg.brioutLow,
        brioutHigh: cfg.brioutHigh,
      },
    },
  };
}

export { computeLeumi } from '@/domain/bituah/leumi';
export { computeBriout } from '@/domain/bituah/briout';
export { SELF_LEUMI_DEDUCTIBLE_RATIO } from '@/domain/bituah/rates';
