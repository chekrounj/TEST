/** Safe arithmetic expression parser — no eval(), no Function(). */

export type ParseResult = { ok: true; value: number } | { ok: false };

/**
 * Parses and evaluates a simple arithmetic expression.
 * Supports: + - * / ( ) unary-minus, integer and decimal literals.
 * Normalises comma → dot (French decimal separator).
 */
export function parseMath(expr: string): ParseResult {
  const input = expr.trim().replace(/\s/g, '').replace(/,/g, '.');
  if (!input) return { ok: false };

  let pos = 0;
  const cur = () => input[pos] ?? '';

  function parseExpr(): number {
    let left = parseTerm();
    while (pos < input.length) {
      const op = cur();
      if (op !== '+' && op !== '-') break;
      pos++;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();
    while (pos < input.length) {
      const op = cur();
      if (op !== '*' && op !== '/') break;
      pos++;
      const right = parseFactor();
      if (op === '/') {
        if (right === 0) throw new Error('div/0');
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }

  function parseFactor(): number {
    if (cur() === '(') {
      pos++;
      const val = parseExpr();
      if (cur() !== ')') throw new Error('missing )');
      pos++;
      return val;
    }
    if (cur() === '-') { pos++; return -parseFactor(); }
    if (cur() === '+') { pos++; return parseFactor(); }
    return parseNum();
  }

  function parseNum(): number {
    const start = pos;
    while (pos < input.length && /[\d.]/.test(cur())) pos++;
    if (pos === start) throw new Error(`unexpected: ${cur()}`);
    const n = parseFloat(input.slice(start, pos));
    if (!isFinite(n)) throw new Error('not finite');
    return n;
  }

  try {
    const value = parseExpr();
    if (pos !== input.length) throw new Error(`trailing: ${input.slice(pos)}`);
    if (!isFinite(value)) return { ok: false };
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}
