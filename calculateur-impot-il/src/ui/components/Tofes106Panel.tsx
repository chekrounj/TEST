import type { ReactNode } from 'react';
import { useCalculatorStore } from '@/store/calculatorStore';
import { getTaxRules } from '@/domain/tax/rules';
import { computeTofes106 } from '@/domain/tax/tofes106';
import { CalcInput } from '@/ui/components/CalcInput';
import { ils, ils2 } from '@/ui/shared/format';

const inputCls =
  'rounded-md border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">
        {label}
        {hint && <span className="ml-1 text-xs font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/**
 * Panneau « Tofes 106 » : saisie des cases du formulaire 106 d'un salarié pour
 * reconstituer l'impôt retenu (case 042) et le comparer au montant officiel.
 */
export function Tofes106Panel() {
  const s = useCalculatorStore();
  const rules = getTaxRules(s.year);

  const result = computeTofes106(
    {
      taxableSalary: s.t106TaxableSalary,
      deductions: s.t106Deductions,
      points: s.t106Points,
      pointValue: s.t106PointValue,
      extraCredits: s.t106ExtraCredits,
    },
    rules,
  );

  const diff = result.computedTax042 - s.t106Official042;
  const hasOfficial = s.t106Official042 > 0;
  const closeEnough = Math.abs(diff) <= 1; // au shekel près

  return (
    <section className="rounded-card bg-white p-5 shadow-sm dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Tofes 106 — salarié (case 042)</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800">
          année {s.year}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Salaire imposable" hint='(158 / סה"כ שכר)'>
          <CalcInput value={s.t106TaxableSalary} onChange={(v) => s.set('t106TaxableSalary', v)} min={0} className={inputCls} formatResult={ils} />
        </Field>
        <Field label="Déductions du revenu" hint="(קופת גמל…)">
          <CalcInput value={s.t106Deductions} onChange={(v) => s.set('t106Deductions', v)} min={0} className={inputCls} formatResult={ils} />
        </Field>
        <Field label="Points de crédit" hint="(נקודות זיכוי)">
          <CalcInput value={s.t106Points} onChange={(v) => s.set('t106Points', v)} min={0} className={inputCls} formatResult={(v) => `${v.toFixed(2)} pt`} />
        </Field>
        <Field label="Valeur du point" hint="(₪/pt — étranger ≠ standard)">
          <CalcInput value={s.t106PointValue} onChange={(v) => s.set('t106PointValue', v)} min={0} className={inputCls} formatResult={ils} />
        </Field>
        <Field label="Crédits d'impôt suppl." hint="(זיכויים)">
          <CalcInput value={s.t106ExtraCredits} onChange={(v) => s.set('t106ExtraCredits', v)} min={0} className={inputCls} formatResult={ils} />
        </Field>
        <Field label="Case 042 officielle" hint="(pour comparer)">
          <CalcInput value={s.t106Official042} onChange={(v) => s.set('t106Official042', v)} min={0} className={inputCls} formatResult={ils} />
        </Field>
      </div>

      {/* Détail du calcul */}
      <div className="mt-4 overflow-hidden rounded-md border border-slate-200 text-sm dark:border-slate-700">
        <Row label="Revenu imposable (158 − déductions)" value={ils(result.taxableIncome)} />
        <Row label="Impôt progressif (barème)" value={ils(result.incomeTax.totalTax)} />
        {result.surtax.amount > 0 && (
          <Row
            label={`Surtaxe מס יסף (${(result.surtax.rate * 100).toFixed(0)}% au-delà de ${ils(result.surtax.threshold)})`}
            value={`+ ${ils(result.surtax.amount)}`}
          />
        )}
        <Row label={`Crédit de points (${s.t106Points.toFixed(2)} × ${ils(s.t106PointValue)})`} value={`− ${ils(result.pointsCredit)}`} />
        {result.extraCredits > 0 && <Row label="Crédits supplémentaires" value={`− ${ils(result.extraCredits)}`} />}
        <Row label="Impôt calculé (≈ case 042)" value={ils2(result.computedTax042)} strong />
      </div>

      {/* Comparaison avec la case 042 officielle */}
      {hasOfficial && (
        <div
          className={`mt-3 rounded-md px-4 py-3 text-sm ${
            closeEnough
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
          }`}
        >
          {closeEnough ? (
            <>✓ Le calcul colle à la case 042 officielle ({ils(s.t106Official042)}).</>
          ) : (
            <>
              Écart avec la case 042 officielle : <strong>{ils2(diff)}</strong>
              {' '}(calculé {ils(result.computedTax042)} vs officiel {ils(s.t106Official042)}).
              Ajustez la valeur du point ou les déductions קופת גמל pour aligner.
            </>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400">
        Astuce : pour un travailleur étranger, la valeur du point lue sur le 106 (ex. 2 178 ₪)
        diffère de la valeur résident ({ils(rules.pointValue)}). Saisissez la valeur exacte du 106.
      </p>
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between border-b border-slate-100 px-4 py-2 last:border-0 dark:border-slate-800 ${
        strong ? 'bg-slate-50 font-semibold dark:bg-slate-800/50' : ''
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
