/**
 * Module Bituah — taux et seuils par année.
 *
 * Les taux et plafonds proviennent des règles annuelles
 * (`src/data/tax-rules-{year}.json`, bloc `bituah`). Ce fichier dérive les
 * bornes **annuelles** à partir des valeurs mensuelles publiées par
 * ביטוח לאומי, et expose les constantes réglementaires associées.
 *
 * Référence : https://www.btl.gov.il/Insurance/Pages/default.aspx
 *
 * NB : les taux du bloc `bituah` des JSON sont marqués
 * `pending-official-verification` — à recouper sur btl.gov.il avant prod.
 */
import type { TaxpayerStatus } from '@/types';
import { getTaxRules } from '@/domain/tax/rules';

/**
 * Part du Bituah Leumi déductible du revenu imposable des indépendants (52%).
 * Source : תקנות מס הכנסה — déduction des cotisations de sécurité sociale.
 */
export const SELF_LEUMI_DEDUCTIBLE_RATIO = 0.52;

/** Configuration Bituah annualisée pour un statut donné. */
export interface BituahAnnualConfig {
  /** Seuil annuel (= 60% du salaire moyen × 12) : taux réduit en dessous. */
  thresholdAnnual: number;
  /** Plafond annuel (= 5× le salaire moyen × 12) : pas de cotisation au-delà. */
  maxAnnual: number;
  leumiLow: number;
  leumiHigh: number;
  brioutLow: number;
  brioutHigh: number;
}

/**
 * Renvoie la configuration Bituah annualisée pour une année et un statut.
 */
export function getBituahAnnualConfig(
  year: number,
  status: TaxpayerStatus,
): BituahAnnualConfig {
  const { bituah } = getTaxRules(year);
  const tiers = bituah[status];
  return {
    thresholdAnnual: bituah.thresholdMonthly * 12,
    maxAnnual: bituah.maxMonthly * 12,
    leumiLow: tiers.low.leumi,
    leumiHigh: tiers.high.leumi,
    brioutLow: tiers.low.briout,
    brioutHigh: tiers.high.briout,
  };
}

/** Répartition d'un revenu annuel entre les paliers Bituah. */
export interface IncomeSplit {
  /** Portion sous le seuil (taux réduit). */
  lowPortion: number;
  /** Portion entre le seuil et le plafond (taux plein). */
  highPortion: number;
  /** Portion au-dessus du plafond (non cotisée). */
  cappedExcess: number;
}

/**
 * Découpe un revenu annuel en portions bas / haut / excédent plafonné.
 */
export function splitIncome(
  annualIncome: number,
  thresholdAnnual: number,
  maxAnnual: number,
): IncomeSplit {
  const income =
    Number.isFinite(annualIncome) && annualIncome > 0 ? annualIncome : 0;

  const lowPortion = Math.min(income, thresholdAnnual);
  const highPortion = Math.max(0, Math.min(income, maxAnnual) - thresholdAnnual);
  const cappedExcess = Math.max(0, income - maxAnnual);

  return { lowPortion, highPortion, cappedExcess };
}
