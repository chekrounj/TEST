import { describe, it, expect } from 'vitest';
import { computeBituah } from '@/domain/bituah';
import { getBituahAnnualConfig, splitIncome } from '@/domain/bituah/rates';

/**
 * Cas de référence — Bituah Leumi + Briout (année 2025).
 *
 * Config 2025 (src/data/tax-rules-2025.json) :
 *   seuil mensuel 7 522 ₪  -> seuil annuel  90 264 ₪
 *   plafond mensuel 49 030 ₪ -> plafond annuel 588 360 ₪
 *   Salarié  : leumi 0,4%/7,0% · briout 3,1%/5,0%
 *   Indép.   : leumi 2,87%/12,83% · briout 3,1%/5,0%
 *
 * Attendus calculés à la main, à recouper avec le simulateur ביטוח לאומי
 * (https://b2b.btl.gov.il/btlcalculators/) — cf. docs/validation-cases.md.
 */

const YEAR = 2025;
const THRESHOLD = 90_264;
const MAX = 588_360;

describe('config Bituah annualisée 2025', () => {
  it('dérive seuil et plafond annuels depuis les valeurs mensuelles', () => {
    const cfg = getBituahAnnualConfig(YEAR, 'employee');
    expect(cfg.thresholdAnnual).toBe(THRESHOLD);
    expect(cfg.maxAnnual).toBe(MAX);
  });
});

describe('splitIncome', () => {
  it('revenu sous le seuil : tout en portion basse', () => {
    expect(splitIncome(60_000, THRESHOLD, MAX)).toEqual({
      lowPortion: 60_000,
      highPortion: 0,
      cappedExcess: 0,
    });
  });

  it('revenu entre seuil et plafond : portion basse plafonnée + reste en haut', () => {
    expect(splitIncome(120_000, THRESHOLD, MAX)).toEqual({
      lowPortion: THRESHOLD,
      highPortion: 120_000 - THRESHOLD,
      cappedExcess: 0,
    });
  });

  it('revenu au-dessus du plafond : excédent non cotisé', () => {
    expect(splitIncome(700_000, THRESHOLD, MAX)).toEqual({
      lowPortion: THRESHOLD,
      highPortion: MAX - THRESHOLD,
      cappedExcess: 700_000 - MAX,
    });
  });

  it('revenu négatif ou non fini => 0', () => {
    expect(splitIncome(-1, THRESHOLD, MAX)).toEqual({
      lowPortion: 0,
      highPortion: 0,
      cappedExcess: 0,
    });
    expect(splitIncome(Number.NaN, THRESHOLD, MAX).lowPortion).toBe(0);
  });
});

describe('computeBituah — salarié', () => {
  it('60 000 ₪ (sous le seuil) : 0,4% leumi + 3,1% briout', () => {
    const r = computeBituah(60_000, YEAR, 'employee');
    expect(r.leumi).toBeCloseTo(240, 4); // 60 000 × 0,4%
    expect(r.briout).toBeCloseTo(1_860, 4); // 60 000 × 3,1%
    expect(r.total).toBeCloseTo(2_100, 4);
    expect(r.leumiDeductible).toBe(0); // salarié : pas de déduction
  });

  it('120 000 ₪ (à cheval sur le seuil)', () => {
    const r = computeBituah(120_000, YEAR, 'employee');
    // leumi : 90 264×0,4% + 29 736×7,0%
    expect(r.leumi).toBeCloseTo(2_442.576, 3);
    // briout : 90 264×3,1% + 29 736×5,0%
    expect(r.briout).toBeCloseTo(4_284.984, 3);
    expect(r.total).toBeCloseTo(6_727.56, 3);
    expect(r.breakdown.lowPortion).toBe(THRESHOLD);
    expect(r.breakdown.highPortion).toBe(120_000 - THRESHOLD);
  });
});

describe('computeBituah — indépendant', () => {
  it('120 000 ₪ : taux indépendants + 52% leumi déductible', () => {
    const r = computeBituah(120_000, YEAR, 'self');
    // leumi : 90 264×2,87% + 29 736×12,83%
    expect(r.leumi).toBeCloseTo(6_405.7056, 3);
    // briout : 90 264×3,1% + 29 736×5,0%
    expect(r.briout).toBeCloseTo(4_284.984, 3);
    expect(r.total).toBeCloseTo(10_690.6896, 3);
    expect(r.leumiDeductible).toBeCloseTo(0.52 * 6_405.7056, 3);
  });

  it('700 000 ₪ (au-dessus du plafond) : cotisation plafonnée', () => {
    const r = computeBituah(700_000, YEAR, 'self');
    // leumi : 90 264×2,87% + 498 096×12,83%
    expect(r.leumi).toBeCloseTo(66_496.2936, 2);
    // briout : 90 264×3,1% + 498 096×5,0%
    expect(r.briout).toBeCloseTo(27_702.984, 2);
    expect(r.breakdown.cappedExcess).toBe(700_000 - MAX);
    expect(r.leumiDeductible).toBeCloseTo(0.52 * 66_496.2936, 2);
  });
});

describe('computeBituah — cas limites', () => {
  it('revenu nul => tout à zéro', () => {
    const r = computeBituah(0, YEAR, 'employee');
    expect(r.total).toBe(0);
    expect(r.leumiDeductible).toBe(0);
  });

  it('revenu négatif traité comme 0', () => {
    expect(computeBituah(-100_000, YEAR, 'self').total).toBe(0);
  });

  it('total = leumi + briout', () => {
    const r = computeBituah(250_000, YEAR, 'self');
    expect(r.total).toBeCloseTo(r.leumi + r.briout, 6);
  });
});
