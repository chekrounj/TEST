/**
 * Hook useFxRates — récupère le taux moyen de la devise du revenu et de l'USD
 * (pour l'eshel) sur l'année fiscale, avec repli immédiat sur les valeurs de
 * fallback pour que le calcul fonctionne même hors-ligne.
 */
import { useEffect, useState } from 'react';
import type { Currency, FxResult } from '@/types';
import { getAverageRate } from '@/domain/fx/service';
import { getFallbackRate } from '@/domain/fx/providers';

export interface FxRates {
  income: FxResult;
  usd: FxResult;
  loading: boolean;
}

export function useFxRates(year: number, currency: Currency): FxRates {
  const [rates, setRates] = useState<FxRates>(() => ({
    income: { rate: getFallbackRate(currency, year), source: 'fallback', samplesCount: 0 },
    usd: { rate: getFallbackRate('USD', year), source: 'fallback', samplesCount: 0 },
    loading: true,
  }));

  useEffect(() => {
    let cancelled = false;
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;

    // Repli immédiat (affichage instantané), puis tentative live.
    setRates({
      income: { rate: getFallbackRate(currency, year), source: 'fallback', samplesCount: 0 },
      usd: { rate: getFallbackRate('USD', year), source: 'fallback', samplesCount: 0 },
      loading: true,
    });

    Promise.all([
      getAverageRate(currency, start, end, { fallbackYear: year }),
      getAverageRate('USD', start, end, { fallbackYear: year }),
    ])
      .then(([income, usd]) => {
        if (!cancelled) setRates({ income, usd, loading: false });
      })
      .catch(() => {
        if (!cancelled) setRates((r) => ({ ...r, loading: false }));
      });

    return () => {
      cancelled = true;
    };
  }, [year, currency]);

  return rates;
}
