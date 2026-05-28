import { describe, it, expect } from 'vitest';
import { computePointsCredit, applyPointsCredit } from '@/domain/tax/points';
import { getTaxRules } from '@/domain/tax/rules';

describe('points de crédit', () => {
  const { pointValue } = getTaxRules(2025); // 2 976 ₪/point en 2025

  it('2,25 points × 2 976 ₪ = 6 696 ₪ de crédit', () => {
    expect(computePointsCredit(2.25, pointValue)).toBeCloseTo(6_696, 6);
  });

  it('réduit l’impôt brut du montant du crédit', () => {
    expect(applyPointsCredit(20_000, 2.25, pointValue)).toBeCloseTo(13_304, 6);
  });

  it('ne rend jamais l’impôt négatif', () => {
    expect(applyPointsCredit(1_000, 5, pointValue)).toBe(0);
  });

  it('points négatifs ou non finis traités comme 0', () => {
    expect(computePointsCredit(-3, pointValue)).toBe(0);
    expect(computePointsCredit(Number.NaN, pointValue)).toBe(0);
  });
});
