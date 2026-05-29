import { describe, it, expect } from 'vitest';
import { countWorkdays } from '@/domain/workdays/counter';
import { getIsraeliHolidays } from '@/domain/workdays/holidays';
import { computeProrata } from '@/domain/workdays/prorata';

describe('countWorkdays', () => {
  // 2025-01-05 = dimanche ; 2025-01-11 = samedi.
  it('calendrier Israël (dim→jeu) : 5 jours sur une semaine', () => {
    const r = countWorkdays({
      startDate: '2025-01-05',
      endDate: '2025-01-11',
      calendar: 'israel',
    });
    expect(r.totalWorkdays).toBe(5);
  });

  it('calendrier étranger (lun→ven) : 5 jours sur la même semaine', () => {
    const r = countWorkdays({
      startDate: '2025-01-05',
      endDate: '2025-01-11',
      calendar: 'foreign',
    });
    expect(r.totalWorkdays).toBe(5);
  });

  it('exclut un jour férié tombant un jour ouvré', () => {
    // Yom Kippour 2025 = jeudi 2 octobre (jour ouvré en calendrier Israël).
    const holidays = getIsraeliHolidays(2025);
    const withHoliday = countWorkdays({
      startDate: '2025-09-29', // lundi
      endDate: '2025-10-03', // vendredi
      calendar: 'israel',
      holidays,
    });
    const withoutHoliday = countWorkdays({
      startDate: '2025-09-29',
      endDate: '2025-10-03',
      calendar: 'israel',
    });
    // Lun→Jeu sont ouvrés (le vendredi 3/10 ne l'est pas en calendrier Israël).
    expect(withoutHoliday.totalWorkdays).toBe(4);
    expect(withHoliday.totalWorkdays).toBe(3); // -1 (Yom Kippour, jeudi 2/10)
    expect(withHoliday.holidays.some((h) => h.date === '2025-10-02')).toBe(true);
  });

  it('plage inversée => 0', () => {
    expect(
      countWorkdays({ startDate: '2025-02-10', endDate: '2025-02-01', calendar: 'israel' })
        .totalWorkdays,
    ).toBe(0);
  });
});

describe('getIsraeliHolidays', () => {
  it('renvoie les 9 jours chômés de 2025 (dont Yom Kippour)', () => {
    const h = getIsraeliHolidays(2025);
    expect(h).toHaveLength(9);
    expect(h.some((x) => x.date === '2025-10-02')).toBe(true);
  });
});

describe('computeProrata', () => {
  it('10 jours étranger / 20 ouvrés sur 100 000 ₪ => 50%', () => {
    const r = computeProrata(10, 20, 100_000);
    expect(r.ratio).toBeCloseTo(0.5, 6);
    expect(r.deductionAmount).toBeCloseTo(50_000, 6);
  });

  it('ratio borné à 1', () => {
    expect(computeProrata(30, 20, 100_000).ratio).toBe(1);
  });

  it('total nul => ratio 0', () => {
    expect(computeProrata(5, 0, 100_000).ratio).toBe(0);
  });
});
