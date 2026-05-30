/**
 * Module Pension — cotisation retraite obligatoire des indépendants.
 *
 * Selon la loi de 2017 (חוק פנסיה חובה לעצמאים) :
 *   - 4,45% sur la portion du revenu jusqu'à la moitié du salaire moyen ;
 *   - 12,55% sur la portion entre la moitié et le salaire moyen (1×) ;
 *   - rien au-delà du salaire moyen.
 *
 * La cotisation est entièrement déductible du revenu imposable (ligne
 * automatique ajoutée par l'orchestrateur). Applicable aux indépendants
 * uniquement.
 */
import type { PensionResult } from '@/types';
import { getTaxRules } from '@/domain/tax/rules';

/**
 * Calcule la cotisation retraite obligatoire annuelle d'un indépendant.
 *
 * @param annualIncome Revenu annuel en ILS (négatif/non fini => 0).
 * @param year Année fiscale.
 */
export function computeSelfPension(
  annualIncome: number,
  year: number,
): PensionResult {
  const { avgSalaryMonthly, selfPension } = getTaxRules(year);
  const income =
    Number.isFinite(annualIncome) && annualIncome > 0 ? annualIncome : 0;

  const halfAverageAnnual = (avgSalaryMonthly / 2) * 12;
  const fullAverageAnnual = avgSalaryMonthly * 12;

  const lowPortion = Math.min(income, halfAverageAnnual);
  const highPortion = Math.max(
    0,
    Math.min(income, fullAverageAnnual) - halfAverageAnnual,
  );

  const amount =
    lowPortion * selfPension.lowRate + highPortion * selfPension.highRate;

  return {
    amount,
    lowPortion,
    highPortion,
    lowRate: selfPension.lowRate,
    highRate: selfPension.highRate,
    deductible: amount, // entièrement déductible
  };
}
