/**
 * Module Workdays — décompte des jours ouvrés sur une période.
 *
 * Calendrier :
 *   - Israël  : semaine ouvrée dimanche → jeudi (jours 0–4) ;
 *   - étranger : semaine ouvrée lundi → vendredi (jours 1–5).
 *
 * Les jours fériés fournis et tombant sur un jour ouvré sont exclus du total.
 */
import type { WorkdaysResult } from '@/types';

/** Parse une date `yyyy-mm-dd` en Date locale (midi pour éviter les bascules). */
function parseISO(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export interface CountWorkdaysParams {
  startDate: string;
  endDate: string;
  calendar: 'israel' | 'foreign';
  /** Jours fériés candidats à l'exclusion. */
  holidays?: Array<{ date: string; name: string }>;
}

/** Indique si un jour de la semaine est ouvré selon le calendrier choisi. */
function isWorkday(weekday: number, calendar: 'israel' | 'foreign'): boolean {
  return calendar === 'israel'
    ? weekday >= 0 && weekday <= 4 // dim → jeu
    : weekday >= 1 && weekday <= 5; // lun → ven
}

/**
 * Décompte les jours ouvrés entre deux dates (incluses), hors fériés.
 */
export function countWorkdays(params: CountWorkdaysParams): WorkdaysResult {
  const { startDate, endDate, calendar, holidays = [] } = params;
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  const holidaySet = new Set(holidays.map((h) => h.date));
  const appliedHolidays: Array<{ date: string; name: string }> = [];

  let totalWorkdays = 0;

  if (start.getTime() <= end.getTime()) {
    const cursor = new Date(start);
    while (cursor.getTime() <= end.getTime()) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      if (isWorkday(cursor.getDay(), calendar)) {
        if (holidaySet.has(iso)) {
          const h = holidays.find((x) => x.date === iso)!;
          appliedHolidays.push(h);
        } else {
          totalWorkdays += 1;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return { totalWorkdays, holidays: appliedHolidays, calendar };
}
