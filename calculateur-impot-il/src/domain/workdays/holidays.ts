/**
 * Module Workdays — jours fériés.
 *
 * Les fêtes religieuses israéliennes (jours chômés : Pessah I & VII, Shavouot,
 * Roch Hachana ×2, Yom Kippour, Souccot I, Shmini Atseret) varient selon
 * l'année hébraïque : elles sont calculées automatiquement via `@hebcal/core`.
 * Yom Haatzmaout (fête de l'indépendance) y est ajouté.
 *
 * Pour les autres pays, fournir une table de dates (le décompte des jours
 * ouvrés accepte une liste de fériés à exclure).
 */
import { HebrewCalendar, flags } from '@hebcal/core';

/** Formate une date en `yyyy-mm-dd` (heure locale, sans décalage UTC). */
function formatISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Renvoie les jours fériés chômés israéliens (Gregorian) d'une année civile.
 */
export function getIsraeliHolidays(
  year: number,
): Array<{ date: string; name: string }> {
  const events = HebrewCalendar.calendar({
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31),
    il: true,
    candlelighting: false,
    sedrot: false,
  });

  return events
    .filter(
      (ev) =>
        (ev.getFlags() & flags.CHAG) !== 0 || /Yom HaAtzma/.test(ev.render('en')),
    )
    .map((ev) => ({
      date: formatISO(ev.getDate().greg()),
      name: ev.render('en'),
    }));
}
