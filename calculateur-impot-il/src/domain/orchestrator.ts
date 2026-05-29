/**
 * Orchestrateur — compose tous les modules dans l'ordre de calcul impératif.
 *
 *  1. Conversion du revenu en ILS au taux moyen de la période
 *  2. Annualisation selon le mode (annuel / mensuel×12 / période→12)
 *  3. (jours ouvrés et prorata calculés en aval, étapes 10-11)
 *  4. Eshel (ligne auto, déductible)
 *  5. Retraite obligatoire si indépendant (ligne auto, déductible)
 *  6. Bituah Leumi + Briout sur revenu annualisé
 *  7. Si indépendant : 52% du Bituah Leumi devient une déduction (ligne auto)
 *  8. Somme des déductions (hors prorata)
 *  9. Revenu imposable provisoire = annualisé − déductions
 * 10. Prorata étranger = imposable provisoire × (jours étranger / jours ouvrés)
 * 11. Revenu imposable final = imposable provisoire − prorata
 * 12. Tranches d'impôt sur le revenu imposable final
 * 13. Soustraction des crédits (points × valeur du point)
 * 14. Total annuel = impôt sur le revenu + Bituah Leumi + Bituah Briout
 * 15. Total mensuel = total annuel / 12
 */
import type {
  CalculationInput,
  CalculationResult,
  DeductionLine,
  EshelResult,
  PeriodMode,
} from '@/types';
import { computeProgressiveTax } from '@/domain/tax/brackets';
import { computePointsCredit } from '@/domain/tax/points';
import { getTaxRules } from '@/domain/tax/rules';
import { computeBituah } from '@/domain/bituah';
import { computeSelfPension } from '@/domain/pension/self';
import { computeEshel } from '@/domain/eshel/calculator';
import { computeProrata } from '@/domain/workdays/prorata';

/** Annualise un montant déjà converti en ILS selon le mode de périodicité. */
function annualize(amountILS: number, period: { mode: PeriodMode; months?: number }): number {
  const v = Number.isFinite(amountILS) ? amountILS : 0;
  switch (period.mode) {
    case 'monthly':
      return v * 12;
    case 'partial': {
      const months = period.months && period.months > 0 ? period.months : 12;
      return (v / months) * 12;
    }
    case 'annual':
    default:
      return v;
  }
}

const safe = (n: number): number => (Number.isFinite(n) ? n : 0);

/**
 * Calcule l'eshel total. Si des segments (périodes de voyage) sont fournis, on
 * calcule l'indemnité par période (chacune avec son pays) puis on agrège.
 */
function computeEshelTotal(
  eshelInput: CalculationInput['eshel'],
  year: number,
  usdFxRate: number,
): EshelResult | null {
  if (!eshelInput.enabled) return null;

  const segmentsInput =
    eshelInput.segments && eshelInput.segments.length > 0
      ? eshelInput.segments
      : [{ daysAbroad: eshelInput.daysAbroad, country: eshelInput.country }];

  const results = segmentsInput.map((seg) =>
    computeEshel(seg.daysAbroad, year, seg.country, usdFxRate),
  );

  if (results.length === 1) return results[0];

  const totalUSD = results.reduce((a, e) => a + e.totalUSD, 0);
  const totalILS = results.reduce((a, e) => a + e.totalILS, 0);
  const daysAbroad = results.reduce((a, e) => a + e.daysAbroad, 0);

  return {
    totalUSD,
    totalILS,
    effectiveRatePerDay: daysAbroad > 0 ? totalUSD / daysAbroad : 0,
    surcharge: results.some((e) => e.surcharge === 1.25) ? 1.25 : 1.0,
    isExpensiveCountry: results.some((e) => e.isExpensiveCountry),
    daysAbroad,
    usdFxRate,
    segments: results,
  };
}

/** Exécute le calcul complet à partir des données d'entrée. */
export function calculate(input: CalculationInput): CalculationResult {
  const rules = getTaxRules(input.year);

  // 1 + 2 — conversion ILS puis annualisation
  const incomeILS = safe(input.income.amount) * safe(input.incomeFxRate);
  const annualizedIncome = Math.max(0, annualize(incomeILS, input.period));

  // 4 — eshel (déductible) — une ou plusieurs périodes de voyage
  const eshel = computeEshelTotal(input.eshel, input.year, input.usdFxRate);

  // 5 — retraite obligatoire des indépendants (déductible)
  const pension =
    input.status === 'self' ? computeSelfPension(annualizedIncome, input.year) : null;

  // 6 — Bituah Leumi + Briout
  const bituah = computeBituah(annualizedIncome, input.year, input.status);

  // 7 + 8 — lignes automatiques + déductions manuelles
  const autoDeductions: DeductionLine[] = [];
  if (eshel && eshel.totalILS > 0) {
    autoDeductions.push({
      id: 'auto-eshel',
      label: 'Eshel — mission étranger (לא נתבעו הוצאות לינה)',
      amount: eshel.totalILS,
      auto: true,
    });
  }
  if (pension && pension.deductible > 0) {
    autoDeductions.push({
      id: 'auto-pension',
      label: 'Retraite obligatoire (indépendant)',
      amount: pension.deductible,
      auto: true,
    });
  }
  if (bituah.leumiDeductible > 0) {
    autoDeductions.push({
      id: 'auto-leumi52',
      label: '52% Bituah Leumi déductible (indépendant)',
      amount: bituah.leumiDeductible,
      auto: true,
    });
  }

  const deductions: DeductionLine[] = [...autoDeductions, ...input.manualDeductions];

  // 9 — imposable provisoire (avant prorata)
  const baseDeductions = deductions.reduce((acc, d) => acc + Math.max(0, safe(d.amount)), 0);
  const taxableProvisional = Math.max(0, annualizedIncome - baseDeductions);

  // 10 — prorata étranger : dispense d'impôt au prorata des jours ouvrés à
  // l'étranger = revenu imposable provisoire × (jours étranger / total jours).
  const prorata = computeProrata(
    input.workdays.abroad,
    input.workdays.total,
    taxableProvisional,
  );

  // La dispense prorata est elle-même une déduction (affichée comme telle).
  if (prorata.deductionAmount > 0) {
    deductions.push({
      id: 'auto-prorata',
      label: `Dispense prorata des jours ouvrés à l'étranger (${(prorata.ratio * 100).toFixed(1)} %)`,
      amount: prorata.deductionAmount,
      auto: true,
    });
  }

  const totalDeductions = deductions.reduce((acc, d) => acc + Math.max(0, safe(d.amount)), 0);

  // 11 — imposable final
  const taxableFinal = Math.max(0, taxableProvisional - prorata.deductionAmount);

  // 12 — impôt sur le revenu
  const incomeTax = computeProgressiveTax(taxableFinal, rules.brackets);

  // 13 — crédits de points
  const pointsCredit = computePointsCredit(input.points, rules.pointValue);
  const incomeTaxAfterCredits = Math.max(0, incomeTax.totalTax - pointsCredit);

  // 14 — total annuel
  const totalAnnual = incomeTaxAfterCredits + bituah.total;

  // 15 — total mensuel
  const totalMonthly = totalAnnual / 12;

  return {
    annualizedIncome,
    eshel,
    pension,
    bituah,
    deductions,
    totalDeductions,
    taxableProvisional,
    prorata,
    taxableFinal,
    incomeTax,
    pointsCredit,
    incomeTaxAfterCredits,
    totalAnnual,
    totalMonthly,
  };
}
