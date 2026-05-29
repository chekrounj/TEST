import { describe, it, expect } from 'vitest';
import { computeSelfPension } from '@/domain/pension/self';

/**
 * Retraite obligatoire des indépendants (2025).
 * avgSalaryMonthly = 13 316 ₪ -> moitié annuelle 79 896 ₪ · plein annuel 159 792 ₪.
 * Taux : 4,45% (bas) / 12,55% (haut).
 */
describe('computeSelfPension 2025', () => {
  it('60 000 ₪ (sous la demi-moyenne) : 4,45%', () => {
    const r = computeSelfPension(60_000, 2025);
    expect(r.amount).toBeCloseTo(2_670, 3); // 60 000 × 4,45%
    expect(r.deductible).toBeCloseTo(r.amount, 6);
  });

  it('100 000 ₪ (à cheval) : 79 896×4,45% + 20 104×12,55%', () => {
    const r = computeSelfPension(100_000, 2025);
    expect(r.amount).toBeCloseTo(6_078.424, 2);
  });

  it('200 000 ₪ (au-dessus de la moyenne) : plafonné à la moyenne', () => {
    const r = computeSelfPension(200_000, 2025);
    // 79 896×4,45% + 79 896×12,55% = 79 896 × 17%
    expect(r.amount).toBeCloseTo(13_582.32, 2);
  });

  it('revenu nul ou négatif => 0', () => {
    expect(computeSelfPension(0, 2025).amount).toBe(0);
    expect(computeSelfPension(-5, 2025).amount).toBe(0);
  });
});
