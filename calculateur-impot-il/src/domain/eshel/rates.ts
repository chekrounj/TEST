/**
 * Module Eshel — taux forfaitaires USD par jour, par année.
 *
 * Tarif forfaitaire (sans frais de logement réclamés) défini dans les
 * תקנות מס הכנסה (ניכוי הוצאות מסוימות), תשל"ב-1972. Les valeurs sont
 * externalisées dans `src/data/tax-rules-{year}.json` (bloc `eshel`).
 */
import { getTaxRules } from '@/domain/tax/rules';

/** Tarif forfaitaire eshel en USD par jour pour une année. */
export function getEshelUsdPerDay(year: number): number {
  return getTaxRules(year).eshel.noLodgingUSDPerDay;
}

/** Taux de majoration pour les pays « chers » (ex. 0,25 = +25%). */
export function getEshelSurchargeRate(year: number): number {
  return getTaxRules(year).eshel.surchargeRate;
}
