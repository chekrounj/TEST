/** Formatage monétaire / pourcentage partagé par l'UI. */

const ilsFmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
});

const ilsFmt2 = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 2,
});

export const ils = (n: number): string => ilsFmt.format(Number.isFinite(n) ? n : 0);
export const ils2 = (n: number): string => ilsFmt2.format(Number.isFinite(n) ? n : 0);
export const pct = (rate: number): string => `${(rate * 100).toFixed(rate * 100 % 1 === 0 ? 0 : 2)} %`;
