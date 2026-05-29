/**
 * Module Workdays — prorata « jours étranger / total jours ouvrés ».
 *
 * Le prorata détermine la part du revenu imposable rattachée à l'activité
 * exercée à l'étranger. Le ratio est borné à [0, 1].
 */
import type { ProrataResult } from '@/types';

/**
 * Calcule le prorata étranger et le montant déductible correspondant.
 *
 * @param daysAbroad Jours ouvrés passés à l'étranger.
 * @param totalWorkdays Total des jours ouvrés sur la période.
 * @param taxableBase Base imposable à laquelle appliquer le prorata.
 */
export function computeProrata(
  daysAbroad: number,
  totalWorkdays: number,
  taxableBase: number,
): ProrataResult {
  const abroad = Number.isFinite(daysAbroad) && daysAbroad > 0 ? daysAbroad : 0;
  const total = Number.isFinite(totalWorkdays) && totalWorkdays > 0 ? totalWorkdays : 0;
  const base = Number.isFinite(taxableBase) && taxableBase > 0 ? taxableBase : 0;

  const ratio = total > 0 ? Math.min(1, abroad / total) : 0;
  return { ratio, deductionAmount: base * ratio };
}
