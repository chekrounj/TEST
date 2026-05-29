import { describe, it, expect } from 'vitest';
import { calculate } from '@/domain/orchestrator';
import type { CalculationInput } from '@/types';

const base: CalculationInput = {
  year: 2025,
  status: 'employee',
  period: { mode: 'annual' },
  income: { amount: 200_000, currency: 'ILS' },
  incomeFxRate: 1,
  usdFxRate: 3.6,
  workdays: { total: 220, abroad: 22 },
  eshel: { enabled: false, daysAbroad: 0, country: 'France' },
  points: 2.25,
  manualDeductions: [],
};

describe('orchestrateur — salarié, 200 000 ₪, prorata 10%', () => {
  const r = calculate(base);

  it('annualise correctement (mode annuel, ILS)', () => {
    expect(r.annualizedIncome).toBe(200_000);
  });

  it('Bituah salarié = 16 327,56 ₪', () => {
    expect(r.bituah.total).toBeCloseTo(16_327.56, 2);
    expect(r.bituah.leumiDeductible).toBe(0);
  });

  it('prorata étranger 10% => imposable final 180 000 ₪', () => {
    expect(r.prorata.ratio).toBeCloseTo(0.1, 6);
    expect(r.taxableFinal).toBeCloseTo(180_000, 6);
  });

  it('la dispense prorata apparaît comme une déduction (revenu × %)', () => {
    const prorata = r.deductions.find((d) => d.id === 'auto-prorata');
    expect(prorata).toBeDefined();
    expect(prorata!.label).toContain('Dispense prorata des jours ouvrés à l\'étranger');
    expect(prorata!.amount).toBeCloseTo(20_000, 6); // 200 000 × 10%
    expect(prorata!.auto).toBe(true);
  });

  it('impôt sur le revenu = 25 392 ₪ avant crédits', () => {
    expect(r.incomeTax.totalTax).toBeCloseTo(25_392, 2);
  });

  it('crédit de 2,25 points = 6 696 ₪', () => {
    expect(r.pointsCredit).toBeCloseTo(6_696, 6);
    expect(r.incomeTaxAfterCredits).toBeCloseTo(18_696, 2);
  });

  it('total annuel = impôt net + Bituah ; mensuel = /12', () => {
    expect(r.totalAnnual).toBeCloseTo(35_023.56, 2);
    expect(r.totalMonthly).toBeCloseTo(35_023.56 / 12, 2);
  });
});

describe('orchestrateur — indépendant : lignes auto déductibles', () => {
  const r = calculate({
    ...base,
    status: 'self',
    eshel: { enabled: true, daysAbroad: 10, country: 'USA' },
  });

  it('ajoute les déductions automatiques (eshel, retraite, 52% Leumi)', () => {
    const ids = r.deductions.map((d) => d.id);
    expect(ids).toContain('auto-eshel');
    expect(ids).toContain('auto-pension');
    expect(ids).toContain('auto-leumi52');
  });

  it('la retraite obligatoire est calculée et déductible', () => {
    expect(r.pension).not.toBeNull();
    expect(r.pension!.deductible).toBeGreaterThan(0);
  });

  it('eshel USA (+25%) : 10 j × 175 $ × 3,6 = 6 300 ₪', () => {
    expect(r.eshel!.totalILS).toBeCloseTo(6_300, 2);
  });

  it('les déductions réduisent l’imposable provisoire', () => {
    expect(r.totalDeductions).toBeGreaterThan(0);
    expect(r.taxableProvisional).toBeLessThan(r.annualizedIncome);
  });
});

describe('orchestrateur — annualisation', () => {
  it('mode mensuel : ×12', () => {
    const r = calculate({ ...base, period: { mode: 'monthly' }, income: { amount: 20_000, currency: 'ILS' } });
    expect(r.annualizedIncome).toBe(240_000);
  });

  it('mode partiel : 6 mois -> ×2', () => {
    const r = calculate({
      ...base,
      period: { mode: 'partial', months: 6 },
      income: { amount: 100_000, currency: 'ILS' },
    });
    expect(r.annualizedIncome).toBe(200_000);
  });

  it('conversion devise : USD × taux', () => {
    const r = calculate({
      ...base,
      income: { amount: 50_000, currency: 'USD' },
      incomeFxRate: 3.6,
    });
    expect(r.annualizedIncome).toBeCloseTo(180_000, 6); // 50 000 × 3,6
  });
});
