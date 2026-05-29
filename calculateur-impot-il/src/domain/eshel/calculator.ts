/**
 * Module Eshel — calcul de l'indemnité forfaitaire de mission à l'étranger
 * sans frais de logement réclamés (לא נתבעו הוצאות לינה).
 *
 * Règles :
 *   - tarif forfaitaire en USD par jour (par année) ;
 *   - majoration +25% pour les pays « chers » ;
 *   - pas de dégressivité dans cette option ;
 *   - conversion USD -> ILS au taux moyen de la période ;
 *   - seuls les jours **entièrement** passés à l'étranger comptent (la règle
 *     « 1 jour partiellement en Israël = jour Israël complet » est appliquée en
 *     amont, lors du décompte des jours).
 */
import type { EshelResult } from '@/types';
import { getEshelUsdPerDay, getEshelSurchargeRate } from '@/domain/eshel/rates';
import { isExpensiveCountry } from '@/domain/eshel/countries';

/**
 * Calcule l'indemnité eshel.
 *
 * @param daysAbroad Nombre de jours entièrement passés à l'étranger.
 * @param year Année fiscale.
 * @param country Pays de mission (détermine la majoration éventuelle).
 * @param usdFxRate Taux moyen USD -> ILS sur la période.
 */
export function computeEshel(
  daysAbroad: number,
  year: number,
  country: string,
  usdFxRate: number,
): EshelResult {
  const days = Number.isFinite(daysAbroad) && daysAbroad > 0 ? daysAbroad : 0;
  const rate = Number.isFinite(usdFxRate) && usdFxRate > 0 ? usdFxRate : 0;

  const usdPerDay = getEshelUsdPerDay(year);
  const expensive = isExpensiveCountry(country);
  const surcharge: 1.0 | 1.25 = expensive
    ? ((1 + getEshelSurchargeRate(year)) as 1.25)
    : 1.0;

  const effectiveRatePerDay = usdPerDay * surcharge;
  const totalUSD = days * effectiveRatePerDay;
  const totalILS = totalUSD * rate;

  return {
    totalUSD,
    totalILS,
    effectiveRatePerDay,
    surcharge,
    isExpensiveCountry: expensive,
    daysAbroad: days,
    usdFxRate: rate,
    country,
  };
}
