import { describe, it, expect } from 'vitest';
import { computeEshel } from '@/domain/eshel/calculator';
import { isExpensiveCountry } from '@/domain/eshel/countries';

describe('isExpensiveCountry', () => {
  it('reconnaît les pays majorés (insensible casse/accents)', () => {
    expect(isExpensiveCountry('USA')).toBe(true);
    expect(isExpensiveCountry('suisse')).toBe(true);
    expect(isExpensiveCountry('Norvège')).toBe(true);
    expect(isExpensiveCountry('norvege')).toBe(true);
  });

  it('renvoie false pour les pays standard', () => {
    expect(isExpensiveCountry('France')).toBe(false);
    expect(isExpensiveCountry('Israël')).toBe(false);
  });
});

describe('computeEshel 2025 (140 $/jour, +25%)', () => {
  it('pays standard : pas de majoration', () => {
    const r = computeEshel(10, 2025, 'France', 3.6);
    expect(r.surcharge).toBe(1.0);
    expect(r.isExpensiveCountry).toBe(false);
    expect(r.effectiveRatePerDay).toBeCloseTo(140, 6);
    expect(r.totalUSD).toBeCloseTo(1_400, 6);
    expect(r.totalILS).toBeCloseTo(5_040, 6); // 1 400 × 3,6
  });

  it('pays majoré : +25%', () => {
    const r = computeEshel(10, 2025, 'USA', 3.6);
    expect(r.surcharge).toBe(1.25);
    expect(r.isExpensiveCountry).toBe(true);
    expect(r.effectiveRatePerDay).toBeCloseTo(175, 6);
    expect(r.totalUSD).toBeCloseTo(1_750, 6);
    expect(r.totalILS).toBeCloseTo(6_300, 6); // 1 750 × 3,6
  });

  it('0 jour => 0', () => {
    expect(computeEshel(0, 2025, 'USA', 3.6).totalILS).toBe(0);
  });
});
