import { useState, useEffect, useRef, useMemo } from 'react';
import { parseMath } from '@/ui/shared/mathParser';

interface CalcInputProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  className?: string;
  /** Format the evaluated result for the detail line (e.g. ils, or "30 j"). */
  formatResult: (v: number) => string;
  /** Round result to nearest integer (for day counts). Default false. */
  integer?: boolean;
}

const HAS_OP = /[+\-*/()]/;

export function CalcInput({
  value,
  onChange,
  min = 0,
  className = '',
  formatResult,
  integer = false,
}: CalcInputProps) {
  const clamp = (v: number) => Math.max(min, integer ? Math.round(v) : v);

  const [raw, setRaw] = useState(() => String(value));
  // expression saved after blur so the detail stays visible
  const [savedExpr, setSavedExpr] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const prevValue = useRef(value);

  // Sync display when external value changes (reset, year change, etc.)
  useEffect(() => {
    if (!focused && prevValue.current !== value) {
      setRaw(String(value));
      setSavedExpr(null);
    }
    prevValue.current = value;
  }, [value, focused]);

  const hasOperator = HAS_OP.test(raw);

  const liveResult = useMemo(() => {
    if (!hasOperator) return null;
    const r = parseMath(raw);
    return r.ok ? r.value : null;
  }, [raw, hasOperator]);

  const savedResult = useMemo(() => {
    if (!savedExpr) return null;
    const r = parseMath(savedExpr);
    return r.ok ? clamp(r.value) : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedExpr, min, integer]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setRaw(v);
    const r = parseMath(v);
    if (r.ok) {
      onChange(clamp(r.value));
    } else {
      const n = Number(v.replace(',', '.'));
      if (isFinite(n)) onChange(clamp(n));
    }
  }

  function handleFocus() {
    setFocused(true);
    // Restore the original expression so the user can edit it
    if (savedExpr !== null) setRaw(savedExpr);
  }

  function handleBlur() {
    setFocused(false);
    const r = parseMath(raw);
    if (r.ok) {
      const clamped = clamp(r.value);
      if (hasOperator) setSavedExpr(raw.trim());
      setRaw(String(clamped));
      onChange(clamped);
    } else {
      // Revert to last known good numeric value
      setRaw(String(value));
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      <input
        type="text"
        inputMode="decimal"
        className={className}
        value={raw}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {/* Live preview while typing an expression */}
      {focused && hasOperator && liveResult !== null && (
        <p className="text-xs text-blue-500 dark:text-blue-400">
          = {formatResult(clamp(liveResult))}
        </p>
      )}
      {/* Saved detail after blur */}
      {!focused && savedExpr && savedResult !== null && (
        <p className="text-xs font-mono text-slate-400 dark:text-slate-500">
          {savedExpr} = {formatResult(savedResult)}
        </p>
      )}
    </div>
  );
}
