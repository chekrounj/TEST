import { describe, it, expect } from 'vitest';
import { computeSurtax } from '@/domain/tax/surtax';
import { computeTofes106 } from '@/domain/tax/tofes106';
import { getTaxRules } from '@/domain/tax/rules';

describe('computeSurtax (מס יסף)', () => {
  const rules2025 = getTaxRules(2025).surtax;

  it('aucune surtaxe sous le seuil', () => {
    const r = computeSurtax(500_000, rules2025);
    expect(r.amount).toBe(0);
    expect(r.taxedAmount).toBe(0);
  });

  it('3% au-delà de 721 560 ₪ (2025)', () => {
    const r = computeSurtax(1_000_000, rules2025);
    expect(r.threshold).toBe(721_560);
    expect(r.rate).toBe(0.03);
    expect(r.taxedAmount).toBeCloseTo(278_440, 6); // 1 000 000 − 721 560
    expect(r.amount).toBeCloseTo(8_353.2, 4); // 278 440 × 3%
  });

  it('renvoie 0 si aucune règle (rétro-compat)', () => {
    const r = computeSurtax(1_000_000, undefined);
    expect(r.amount).toBe(0);
  });

  it('seuils annuels différents (2022 = 663 240 ₪)', () => {
    const r = computeSurtax(800_000, getTaxRules(2022).surtax);
    expect(r.threshold).toBe(663_240);
    expect(r.amount).toBeCloseTo((800_000 - 663_240) * 0.03, 4);
  });
});

describe('computeTofes106 — reconstitution case 042', () => {
  const rules = getTaxRules(2025);

  it('cas simple sans surtaxe ni déductions', () => {
    const r = computeTofes106(
      { taxableSalary: 200_000, deductions: 0, points: 2.25, pointValue: 2976, extraCredits: 0 },
      rules,
    );
    expect(r.taxableIncome).toBe(200_000);
    // barème 2025 sur 200 000 = 30 952 (cf. brackets) − points 6 696
    expect(r.pointsCredit).toBeCloseTo(2.25 * 2976, 6);
    expect(r.computedTax042).toBeCloseTo(r.incomeTax.totalTax - r.pointsCredit, 6);
  });

  it('valeur du point étranger (2 178 ₪) prise en compte', () => {
    const r = computeTofes106(
      { taxableSalary: 200_000, deductions: 0, points: 1, pointValue: 2178, extraCredits: 0 },
      rules,
    );
    expect(r.pointsCredit).toBeCloseTo(2178, 6);
  });

  it('déductions réduisent le revenu imposable', () => {
    const r = computeTofes106(
      { taxableSalary: 300_000, deductions: 50_000, points: 0, pointValue: 2976, extraCredits: 0 },
      rules,
    );
    expect(r.taxableIncome).toBe(250_000);
  });

  it('haut revenu : surtaxe מס יסף incluse dans le 042 calculé', () => {
    const r = computeTofes106(
      { taxableSalary: 1_000_000, deductions: 0, points: 0, pointValue: 2976, extraCredits: 0 },
      rules,
    );
    expect(r.surtax.amount).toBeGreaterThan(0);
    expect(r.computedTax042).toBeCloseTo(r.incomeTax.totalTax + r.surtax.amount, 6);
  });
});
