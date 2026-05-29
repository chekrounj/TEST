/**
 * Module FX — fournisseurs de taux de change.
 *
 * Stratégie (cf. service.ts) :
 *   1. Bank of Israel (taux officiels שערים יציגים) — TODO Phase 2 (API à
 *      stabiliser) : le fournisseur lève une erreur pour l'instant et le
 *      service passe au suivant.
 *   2. exchangerate.host — taux quotidiens, moyenne arithmétique sur la période.
 *   3. Fallback : valeurs par année (`tax-rules-{year}.json`, bloc fxFallback).
 */
import type { Currency } from '@/types';
import { getTaxRules } from '@/domain/tax/rules';

export interface ProviderResult {
  rate: number;
  samplesCount: number;
}

export interface FxProvider {
  name: 'boi' | 'exchangerate';
  getAverageRate(
    currency: Currency,
    startDate: string,
    endDate: string,
  ): Promise<ProviderResult>;
}

const EXCHANGERATE_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EXCHANGERATE_API_BASE) ||
  'https://api.exchangerate.host';

const BOI_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BOI_API_BASE) ||
  'https://boi.org.il';

/**
 * Fournisseur Bank of Israel.
 * TODO Phase 2 : implémenter l'appel à l'API officielle (format à valider,
 * cf. docs/tax-rules-sources.md). En attendant, on lève pour basculer sur le
 * fournisseur suivant.
 */
export const boiProvider: FxProvider = {
  name: 'boi',
  async getAverageRate() {
    void BOI_BASE;
    throw new Error('BoI provider non implémenté (Phase 2)');
  },
};

/**
 * Fournisseur exchangerate.host : moyenne arithmétique des taux quotidiens
 * `currency -> ILS` sur la période.
 */
export const exchangerateProvider: FxProvider = {
  name: 'exchangerate',
  async getAverageRate(currency, startDate, endDate) {
    const url = `${EXCHANGERATE_BASE}/timeseries?start_date=${startDate}&end_date=${endDate}&base=${currency}&symbols=ILS`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`exchangerate.host HTTP ${res.status}`);
    const data: { rates?: Record<string, { ILS?: number }> } = await res.json();
    const rates = data.rates ?? {};

    const samples: number[] = [];
    for (const day of Object.values(rates)) {
      if (typeof day?.ILS === 'number' && Number.isFinite(day.ILS)) {
        samples.push(day.ILS);
      }
    }
    if (samples.length === 0) throw new Error('exchangerate.host : aucune donnée');

    const rate = samples.reduce((a, b) => a + b, 0) / samples.length;
    return { rate, samplesCount: samples.length };
  },
};

/** Liste ordonnée des fournisseurs (primaire d'abord). */
export const DEFAULT_PROVIDERS: FxProvider[] = [boiProvider, exchangerateProvider];

/**
 * Valeur de repli (fallback) pour une devise, à partir des règles annuelles.
 * Pour une année provisoire (sans données), `getTaxRules` renvoie déjà les
 * règles de la dernière année connue : on utilise donc le change connu le plus
 * récent (« celui connu l'année en cours »).
 */
export function getFallbackRate(currency: Currency, year: number): number {
  if (currency === 'ILS') return 1;
  const fallback = getTaxRules(year).fxFallback;
  return fallback[currency] ?? 1;
}
