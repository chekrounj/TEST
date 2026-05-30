/**
 * Module FX — service de taux de change avec cache.
 *
 * Calcule le **taux moyen sur la période** (start → end) : on interroge les
 * fournisseurs dans l'ordre, et à défaut on utilise la valeur de repli de
 * l'année. Le résultat est mis en cache (localStorage, TTL 24h) pour éviter
 * les requêtes répétées.
 */
import type { Currency, FxResult } from '@/types';
import {
  DEFAULT_PROVIDERS,
  getFallbackRate,
  type FxProvider,
} from '@/domain/fx/providers';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CACHE_PREFIX = 'fx:';

interface CachedFx extends FxResult {
  ts: number;
}

function cacheKey(currency: Currency, start: string, end: string): string {
  return `${CACHE_PREFIX}${currency}:${start}:${end}`;
}

function readCache(key: string): FxResult | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedFx;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return { rate: parsed.rate, source: parsed.source, samplesCount: parsed.samplesCount };
  } catch {
    return null;
  }
}

function writeCache(key: string, value: FxResult): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const payload: CachedFx = { ...value, ts: Date.now() };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* quota / mode privé : on ignore */
  }
}

export interface FxServiceOptions {
  providers?: FxProvider[];
  /** Désactive le cache (utile pour les tests). */
  useCache?: boolean;
  /** Année utilisée pour la valeur de repli. */
  fallbackYear: number;
}

/**
 * Renvoie le taux moyen `currency -> ILS` sur la période.
 * Ne rejette jamais : en dernier recours, renvoie la valeur de repli.
 */
export async function getAverageRate(
  currency: Currency,
  startDate: string,
  endDate: string,
  options: FxServiceOptions,
): Promise<FxResult> {
  const { providers = DEFAULT_PROVIDERS, useCache = true, fallbackYear } = options;

  if (currency === 'ILS') {
    return { rate: 1, source: 'fallback', samplesCount: 0 };
  }

  const key = cacheKey(currency, startDate, endDate);
  if (useCache) {
    const cached = readCache(key);
    if (cached) return cached;
  }

  for (const provider of providers) {
    try {
      const { rate, samplesCount } = await provider.getAverageRate(
        currency,
        startDate,
        endDate,
      );
      if (Number.isFinite(rate) && rate > 0) {
        const result: FxResult = { rate, source: provider.name, samplesCount };
        if (useCache) writeCache(key, result);
        return result;
      }
    } catch {
      /* fournisseur indisponible : on essaie le suivant */
    }
  }

  return {
    rate: getFallbackRate(currency, fallbackYear),
    source: 'fallback',
    samplesCount: 0,
  };
}
