import { describe, it, expect } from 'vitest';
import { computeProgressiveTax } from '@/domain/tax/brackets';
import { getTaxRules, AVAILABLE_YEARS } from '@/domain/tax/rules';

/**
 * Cas de référence — impôt sur le revenu progressif.
 *
 * Chaque attendu ci-dessous est calculé manuellement à partir du barème annuel
 * publié par רשות המסים (chargé depuis src/data/tax-rules-{year}.json), en
 * appliquant chaque taux marginal à la portion de revenu correspondante.
 *
 * TRAÇABILITÉ : la valeur « computed » documentée correspond au calcul à la
 * main des tranches. Elle doit être recoupée avec le simulateur officiel
 * (https://www.misim.gov.il) lors de la validation — voir
 * docs/validation-cases.md. Toute divergence => mettre à jour le JSON de
 * l'année concernée, pas la logique.
 */

interface Case {
  income: number;
  expected: number;
  note: string;
}

const CASES: Record<number, Case[]> = {
  // Barème 2022 : 77 400(10%) · 110 880(14%) · 178 080(20%) · 247 440(31%) ·
  //               514 920(35%) · 663 240(47%) · +(50%)
  2022: [
    { income: 50_000, expected: 5_000, note: '1re tranche : 50 000 × 10%' },
    { income: 100_000, expected: 10_904, note: '7 740 + (100 000−77 400)×14%' },
    { income: 200_000, expected: 32_662.4, note: '25 867,2 + (200 000−178 080)×31%' },
    { income: 300_000, expected: 65_764.8, note: '47 368,8 + (300 000−247 440)×35%' },
    { income: 600_000, expected: 180_974.4, note: '140 986,8 + (600 000−514 920)×47%' },
  ],
  // Barème 2023 : 81 480(10%) · 116 760(14%) · 187 440(20%) · 260 520(31%) ·
  //               542 160(35%) · 698 280(47%) · +(50%)
  2023: [
    { income: 100_000, expected: 10_740.8, note: '8 148 + (100 000−81 480)×14%' },
    { income: 150_000, expected: 19_735.2, note: '13 087,2 + (150 000−116 760)×20%' },
    { income: 250_000, expected: 46_616.8, note: '27 223,2 + (250 000−187 440)×31%' },
    { income: 400_000, expected: 98_696, note: '49 878 + (400 000−260 520)×35%' },
    { income: 700_000, expected: 222_688.4, note: '221 828,4 + (700 000−698 280)×50%' },
  ],
  // Barème 2024 : 84 120(10%) · 120 720(14%) · 193 800(20%) · 269 280(31%) ·
  //               560 280(35%) · 721 560(47%) · +(50%)
  2024: [
    { income: 100_000, expected: 10_635.2, note: '8 412 + (100 000−84 120)×14%' },
    { income: 200_000, expected: 30_074, note: '28 152 + (200 000−193 800)×31%' },
    { income: 300_000, expected: 62_302.8, note: '51 550,8 + (300 000−269 280)×35%' },
    { income: 500_000, expected: 132_302.8, note: '51 550,8 + (500 000−269 280)×35%' },
    { income: 800_000, expected: 268_422.4, note: '229 202,4 + (800 000−721 560)×50%' },
  ],
  // Barème 2025 : identique à 2024 (gel des tranches, sans indexation).
  2025: [
    { income: 100_000, expected: 10_635.2, note: '8 412 + (100 000−84 120)×14%' },
    { income: 200_000, expected: 30_074, note: '28 152 + (200 000−193 800)×31%' },
    { income: 300_000, expected: 62_302.8, note: '51 550,8 + (300 000−269 280)×35%' },
    { income: 500_000, expected: 132_302.8, note: '51 550,8 + (500 000−269 280)×35%' },
    { income: 800_000, expected: 268_422.4, note: '229 202,4 + (800 000−721 560)×50%' },
  ],
};

describe('computeProgressiveTax — cas de référence par année', () => {
  for (const year of [2022, 2023, 2024, 2025]) {
    describe(`barème ${year}`, () => {
      const { brackets } = getTaxRules(year);

      for (const { income, expected, note } of CASES[year]) {
        it(`${income.toLocaleString('fr-FR')} ₪ → ${expected} ₪ (${note})`, () => {
          const result = computeProgressiveTax(income, brackets);
          expect(result.totalTax).toBeCloseTo(expected, 1);
        });
      }
    });
  }
});

describe('computeProgressiveTax — propriétés du breakdown', () => {
  const { brackets } = getTaxRules(2025);

  it('la somme des taxes du breakdown égale le total', () => {
    const result = computeProgressiveTax(300_000, brackets);
    const sum = result.breakdown.reduce((acc, b) => acc + b.tax, 0);
    expect(sum).toBeCloseTo(result.totalTax, 6);
  });

  it('chaque ligne de breakdown taxe la bonne portion au bon taux', () => {
    const result = computeProgressiveTax(100_000, brackets);
    for (const line of result.breakdown) {
      expect(line.taxedAmount).toBeCloseTo(line.to - line.from, 6);
      expect(line.tax).toBeCloseTo(line.taxedAmount * line.rate, 6);
    }
  });

  it('les tranches du breakdown sont contiguës et croissantes', () => {
    const result = computeProgressiveTax(800_000, brackets);
    let prevTo = 0;
    for (const line of result.breakdown) {
      expect(line.from).toBeCloseTo(prevTo, 6);
      expect(line.to).toBeGreaterThan(line.from);
      prevTo = line.to;
    }
  });
});

describe('computeProgressiveTax — cas limites', () => {
  const { brackets } = getTaxRules(2025);

  it('revenu nul => impôt nul, breakdown vide', () => {
    const result = computeProgressiveTax(0, brackets);
    expect(result.totalTax).toBe(0);
    expect(result.breakdown).toHaveLength(0);
  });

  it('revenu négatif traité comme 0', () => {
    expect(computeProgressiveTax(-50_000, brackets).totalTax).toBe(0);
  });

  it('valeur non finie (NaN) traitée comme 0', () => {
    expect(computeProgressiveTax(Number.NaN, brackets).totalTax).toBe(0);
  });

  it('pile au plafond de la 1re tranche (84 120 ₪) => 8 412 ₪', () => {
    expect(computeProgressiveTax(84_120, brackets).totalTax).toBeCloseTo(8_412, 6);
  });
});

describe('getTaxRules', () => {
  it('expose les années 2022 à 2025', () => {
    expect(AVAILABLE_YEARS).toEqual([2022, 2023, 2024, 2025]);
  });

  it('lève une erreur pour une année non supportée', () => {
    expect(() => getTaxRules(2019)).toThrow();
  });

  it('chaque barème se termine par une tranche sans plafond (limit null)', () => {
    for (const year of AVAILABLE_YEARS) {
      const { brackets } = getTaxRules(year);
      expect(brackets[brackets.length - 1].limit).toBeNull();
    }
  });
});
