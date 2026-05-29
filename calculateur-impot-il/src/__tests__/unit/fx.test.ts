import { describe, it, expect, vi, afterEach } from 'vitest';
import { exchangerateProvider, getFallbackRate, type FxProvider } from '@/domain/fx/providers';
import { getAverageRate } from '@/domain/fx/service';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('exchangerateProvider', () => {
  it('moyenne arithmétique des taux quotidiens', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          rates: {
            '2025-01-01': { ILS: 3.5 },
            '2025-01-02': { ILS: 3.7 },
            '2025-01-03': { ILS: 3.6 },
          },
        }),
      })),
    );

    const r = await exchangerateProvider.getAverageRate('USD', '2025-01-01', '2025-01-03');
    expect(r.rate).toBeCloseTo(3.6, 6);
    expect(r.samplesCount).toBe(3);
  });

  it('lève si réponse HTTP en erreur', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));
    await expect(
      exchangerateProvider.getAverageRate('USD', '2025-01-01', '2025-01-03'),
    ).rejects.toThrow();
  });
});

describe('getFallbackRate', () => {
  it('USD 2025 = 3.60 (fxFallback)', () => {
    expect(getFallbackRate('USD', 2025)).toBeCloseTo(3.6, 6);
  });
  it('ILS = 1', () => {
    expect(getFallbackRate('ILS', 2025)).toBe(1);
  });
});

describe('getAverageRate (service)', () => {
  it('ILS renvoie toujours 1, sans fournisseur', async () => {
    const r = await getAverageRate('ILS', '2025-01-01', '2025-01-31', { fallbackYear: 2025 });
    expect(r.rate).toBe(1);
  });

  it('utilise un fournisseur disponible', async () => {
    const provider: FxProvider = {
      name: 'exchangerate',
      getAverageRate: async () => ({ rate: 3.85, samplesCount: 5 }),
    };
    const r = await getAverageRate('EUR', '2025-01-01', '2025-01-31', {
      providers: [provider],
      useCache: false,
      fallbackYear: 2025,
    });
    expect(r.rate).toBeCloseTo(3.85, 6);
    expect(r.source).toBe('exchangerate');
  });

  it('bascule sur le fallback si tous les fournisseurs échouent', async () => {
    const failing: FxProvider = {
      name: 'boi',
      getAverageRate: async () => {
        throw new Error('indisponible');
      },
    };
    const r = await getAverageRate('USD', '2025-01-01', '2025-01-31', {
      providers: [failing],
      useCache: false,
      fallbackYear: 2025,
    });
    expect(r.source).toBe('fallback');
    expect(r.rate).toBeCloseTo(3.6, 6);
  });
});
