import { describe, it, expect } from 'vitest';
import { parseMath } from '@/ui/shared/mathParser';

function val(expr: string): number {
  const r = parseMath(expr);
  if (!r.ok) throw new Error(`parse failed: ${expr}`);
  return r.value;
}

describe('parseMath', () => {
  it('plain integer', () => expect(val('42')).toBe(42));
  it('plain decimal', () => expect(val('3.14')).toBeCloseTo(3.14));
  it('comma decimal separator', () => expect(val('3,14')).toBeCloseTo(3.14));
  it('addition', () => expect(val('50000+30000')).toBe(80000));
  it('subtraction', () => expect(val('100-25')).toBe(75));
  it('multiplication', () => expect(val('12*3')).toBe(36));
  it('division', () => expect(val('100/4')).toBe(25));
  it('operator precedence (* before +)', () => expect(val('2+3*4')).toBe(14));
  it('parentheses override precedence', () => expect(val('(2+3)*4')).toBe(20));
  it('unary minus', () => expect(val('-5')).toBe(-5));
  it('unary minus in expression', () => expect(val('10+-3')).toBe(7));
  it('nested parentheses', () => expect(val('((2+3))*4')).toBe(20));
  it('spaces are ignored', () => expect(val('50 000 + 30 000')).toBe(80000));
  it('chain: 220/5*3', () => expect(val('220/5*3')).toBeCloseTo(132));

  it('empty string → ok:false', () => expect(parseMath('').ok).toBe(false));
  it('trailing operator → ok:false', () => expect(parseMath('50+').ok).toBe(false));
  it('mismatched paren → ok:false', () => expect(parseMath('(50+30').ok).toBe(false));
  it('division by zero → ok:false', () => expect(parseMath('1/0').ok).toBe(false));
  it('letters → ok:false', () => expect(parseMath('abc').ok).toBe(false));
});
