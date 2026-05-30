/**
 * Module Bituah Briout — cotisation d'assurance maladie.
 *
 * Même logique de paliers que le Bituah Leumi (seuil = 60% du salaire moyen,
 * plafond = 5× le salaire moyen), avec ses propres taux. La cotisation maladie
 * n'est pas déductible du revenu imposable.
 */
import type { BituahComponent, TaxpayerStatus } from '@/types';
import {
  getBituahAnnualConfig,
  splitIncome,
  type IncomeSplit,
} from '@/domain/bituah/rates';

/** Calcule la cotisation Bituah Briout annuelle. */
export function computeBriout(
  annualIncome: number,
  year: number,
  status: TaxpayerStatus,
  split?: IncomeSplit,
): BituahComponent {
  const cfg = getBituahAnnualConfig(year, status);
  const { lowPortion, highPortion } =
    split ?? splitIncome(annualIncome, cfg.thresholdAnnual, cfg.maxAnnual);

  const amount = lowPortion * cfg.brioutLow + highPortion * cfg.brioutHigh;

  return {
    amount,
    lowPortion,
    highPortion,
    rateLow: cfg.brioutLow,
    rateHigh: cfg.brioutHigh,
  };
}
