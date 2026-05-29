import { useState, useEffect, useRef } from 'react';

/** yyyy-mm-dd → jj/mm/aaaa */
function isoToFr(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** jj/mm/aaaa → yyyy-mm-dd, ou null si invalide */
function frToIso(fr: string): string | null {
  const m = fr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(iso);
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) return null;
  return iso;
}

/** Formate une suite de chiffres bruts en jj/mm/aaaa progressif */
function autoFormat(digits: string): string {
  const d = digits.slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

interface DateInputProps {
  /** Date en format ISO yyyy-mm-dd */
  value: string;
  onChange: (iso: string) => void;
  className?: string;
}

export function DateInput({ value, onChange, className = '' }: DateInputProps) {
  const [raw, setRaw] = useState(() => isoToFr(value));
  const prevValue = useRef(value);

  // Sync quand la valeur change de l'extérieur (reset, changement d'année)
  useEffect(() => {
    if (prevValue.current !== value) {
      setRaw(isoToFr(value));
      prevValue.current = value;
    }
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target.value;

    // Conserver uniquement les chiffres, puis re-formater
    const digits = input.replace(/\D/g, '');
    const formatted = autoFormat(digits);
    setRaw(formatted);

    // Déclencher onChange seulement si date complète et valide
    if (digits.length === 8) {
      const iso = frToIso(formatted);
      if (iso) {
        prevValue.current = iso;
        onChange(iso);
      }
    }
  }

  function handleBlur() {
    const iso = frToIso(raw);
    if (iso) {
      // Normalise l'affichage
      setRaw(isoToFr(iso));
    } else {
      // Rétablit la dernière valeur valide
      setRaw(isoToFr(value));
    }
  }

  const isError = raw.length > 0 && raw.length < 10;

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="jj/mm/aaaa"
      maxLength={10}
      className={`${className}${isError ? ' border-red-400 dark:border-red-600' : ''}`}
      value={raw}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
