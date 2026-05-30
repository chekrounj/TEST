import { describe, it, expect } from 'vitest';

// Fonctions pures extraites de DateInput pour test unitaire.

function isoToFr(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function frToIso(fr: string): string | null {
  const m = fr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(iso);
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) return null;
  return iso;
}

function autoFormat(digits: string): string {
  const d = digits.slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

describe('isoToFr', () => {
  it('convertit une date ISO en jj/mm/aaaa', () => {
    expect(isoToFr('2026-01-15')).toBe('15/01/2026');
    expect(isoToFr('2025-12-31')).toBe('31/12/2025');
  });
  it('renvoie chaîne vide si format invalide', () => {
    expect(isoToFr('2026-1-5')).toBe('');
    expect(isoToFr('')).toBe('');
  });
});

describe('frToIso', () => {
  it('convertit jj/mm/aaaa en ISO', () => {
    expect(frToIso('15/01/2026')).toBe('2026-01-15');
    expect(frToIso('31/12/2025')).toBe('2025-12-31');
  });
  it('rejette une date invalide', () => {
    expect(frToIso('32/01/2026')).toBeNull();
    expect(frToIso('29/02/2025')).toBeNull(); // 2025 n'est pas bissextile
    expect(frToIso('29/02/2024')).toBe('2024-02-29'); // 2024 est bissextile
  });
  it('rejette un format incomplet', () => {
    expect(frToIso('1/01/2026')).toBeNull();
    expect(frToIso('15/1/2026')).toBeNull();
    expect(frToIso('15/01/26')).toBeNull();
  });
});

describe('autoFormat', () => {
  it('formate les chiffres progressivement', () => {
    expect(autoFormat('1')).toBe('1');
    expect(autoFormat('15')).toBe('15');
    expect(autoFormat('150')).toBe('15/0');
    expect(autoFormat('1501')).toBe('15/01');
    expect(autoFormat('15012')).toBe('15/01/2');
    expect(autoFormat('15012026')).toBe('15/01/2026');
  });
  it('ignore les chiffres au-delà de 8', () => {
    expect(autoFormat('150120261234')).toBe('15/01/2026');
  });
});
