import { useMemo, type ReactNode } from 'react';
import type { CalculationInput, Currency } from '@/types';
import { useCalculatorStore } from '@/store/calculatorStore';
import { useFxRates } from '@/hooks/useFxRates';
import { calculate } from '@/domain/orchestrator';
import { AVAILABLE_YEARS } from '@/domain/tax/rules';
import { countWorkdays } from '@/domain/workdays/counter';
import { getIsraeliHolidays } from '@/domain/workdays/holidays';
import { COUNTRIES, isExpensiveCountry } from '@/domain/eshel/countries';
import { ResultsPanel } from '@/ui/components/ResultsPanel';
import { ils } from '@/ui/shared/format';
import { openOutlookCompose } from '@/services/outlook';
import { printReport } from '@/services/print';

const CURRENCIES: Currency[] = ['ILS', 'USD', 'EUR', 'GBP', 'CHF'];

const inputCls =
  'rounded-md border border-slate-300 bg-transparent p-2 dark:border-slate-700';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function CalculatorPage() {
  const s = useCalculatorStore();
  const fx = useFxRates(s.year, s.currency);

  // Décompte automatique des jours ouvrés (ou valeur manuelle).
  const workTotal = useMemo(() => {
    if (!s.autoWorkdays) return s.workTotal;
    const holidays = s.calendar === 'israel' ? getIsraeliHolidays(s.year) : [];
    return countWorkdays({
      startDate: s.startDate,
      endDate: s.endDate,
      calendar: s.calendar,
      holidays,
    }).totalWorkdays;
  }, [s.autoWorkdays, s.workTotal, s.calendar, s.year, s.startDate, s.endDate]);

  const input: CalculationInput = {
    year: s.year,
    status: s.status,
    period: { mode: s.periodMode, months: s.periodMonths },
    income: { amount: s.amount, currency: s.currency },
    incomeFxRate: fx.income.rate,
    usdFxRate: fx.usd.rate,
    workdays: { total: workTotal, abroad: s.workAbroad },
    eshel: { enabled: s.eshelEnabled, daysAbroad: s.eshelDays, country: s.eshelCountry },
    points: s.points,
    manualDeductions: s.manualDeductions,
  };

  const result = calculate(input);

  const handleEmail = () => {
    const lines = [
      `Estimation d'impôt israélien — année ${s.year} (${s.status === 'self' ? 'indépendant' : 'salarié'})`,
      '',
      `Revenu annualisé : ${ils(result.annualizedIncome)}`,
      `Revenu imposable : ${ils(result.taxableFinal)}`,
      `Impôt sur le revenu : ${ils(result.incomeTaxAfterCredits)}`,
      `Bituah Leumi + Briout : ${ils(result.bituah.total)}`,
      `TOTAL annuel : ${ils(result.totalAnnual)}`,
      `TOTAL mensuel : ${ils(result.totalMonthly)}`,
      '',
      'Estimation indicative — ne remplace pas un comptable agréé (רואה חשבון).',
    ];
    openOutlookCompose(`Estimation impôt ${s.year}`, lines.join('\n'));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Barre supérieure */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Calculateur d'impôt israélien</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Estimation indicative — impôt, Bituah Leumi/Briout, eshel
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded-full bg-slate-200 px-3 py-1 dark:bg-slate-800">
              USD/ILS {fx.usd.rate.toFixed(2)} · {fx.usd.source}
            </span>
            {s.currency !== 'ILS' && s.currency !== 'USD' && (
              <span className="rounded-full bg-slate-200 px-3 py-1 dark:bg-slate-800">
                {s.currency}/ILS {fx.income.rate.toFixed(2)} · {fx.income.source}
              </span>
            )}
            {fx.loading && <span className="text-slate-400">maj…</span>}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Colonne saisie */}
          <div className="flex flex-col gap-6">
            <Card title="Paramètres généraux">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Année fiscale">
                  <select className={inputCls} value={s.year} onChange={(e) => s.set('year', Number(e.target.value))}>
                    {AVAILABLE_YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Statut">
                  <select className={inputCls} value={s.status} onChange={(e) => s.set('status', e.target.value as 'employee' | 'self')}>
                    <option value="employee">Salarié</option>
                    <option value="self">Indépendant</option>
                  </select>
                </Field>
              </div>
              <div className="mt-4 flex gap-2">
                {(['annual', 'monthly', 'partial'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => s.set('periodMode', m)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                      s.periodMode === m
                        ? 'border-metric bg-metric text-white'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {m === 'annual' ? 'Annuel' : m === 'monthly' ? 'Mensuel ×12' : 'Période'}
                  </button>
                ))}
              </div>
              {s.periodMode === 'partial' && (
                <div className="mt-3">
                  <Field label="Nombre de mois">
                    <input type="number" min={1} max={12} className={inputCls} value={s.periodMonths}
                      onChange={(e) => s.set('periodMonths', Number(e.target.value))} />
                  </Field>
                </div>
              )}
            </Card>

            <Card title="Revenu">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Devise">
                  <select className={inputCls} value={s.currency} onChange={(e) => s.set('currency', e.target.value as Currency)}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label={`Montant (${s.periodMode === 'annual' ? 'annuel' : s.periodMode === 'monthly' ? 'mensuel' : 'période'})`}>
                  <input type="number" min={0} step={1000} className={inputCls} value={s.amount}
                    onChange={(e) => s.set('amount', Number(e.target.value))} />
                </Field>
              </div>
              {s.currency !== 'ILS' && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Converti à {fx.income.rate.toFixed(3)} {s.currency}/ILS ({fx.income.source})
                  → {ils(s.amount * fx.income.rate)}
                </p>
              )}
            </Card>

            <Card title="Jours ouvrés et déplacements">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Début de période">
                  <input type="date" className={inputCls} value={s.startDate} onChange={(e) => s.set('startDate', e.target.value)} />
                </Field>
                <Field label="Fin de période">
                  <input type="date" className={inputCls} value={s.endDate} onChange={(e) => s.set('endDate', e.target.value)} />
                </Field>
                <Field label="Semaine ouvrée">
                  <select className={inputCls} value={s.calendar} onChange={(e) => s.set('calendar', e.target.value as 'israel' | 'foreign')}>
                    <option value="israel">Israël (dim–jeu)</option>
                    <option value="foreign">Étranger (lun–ven)</option>
                  </select>
                </Field>
                <Field label="Jours ouvrés à l'étranger">
                  <input type="number" min={0} className={inputCls} value={s.workAbroad} onChange={(e) => s.set('workAbroad', Number(e.target.value))} />
                </Field>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={s.autoWorkdays} onChange={(e) => s.set('autoWorkdays', e.target.checked)} />
                Calculer automatiquement le total des jours ouvrés (fêtes incluses)
              </label>
              {!s.autoWorkdays && (
                <div className="mt-3">
                  <Field label="Total jours ouvrés (manuel)">
                    <input type="number" min={0} className={inputCls} value={s.workTotal} onChange={(e) => s.set('workTotal', Number(e.target.value))} />
                  </Field>
                </div>
              )}
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Total jours ouvrés retenu : <strong>{workTotal}</strong> · prorata étranger{' '}
                {workTotal > 0 ? ((s.workAbroad / workTotal) * 100).toFixed(1) : '0'} %
              </p>
            </Card>

            <Card title="Points de crédit">
              <input type="range" min={0} max={10} step={0.25} value={s.points} className="w-full"
                onChange={(e) => s.set('points', Number(e.target.value))} />
              <p className="mt-1 text-sm">{s.points.toFixed(2)} point(s)</p>
            </Card>

            <Card title="Eshel — mission à l'étranger">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={s.eshelEnabled} onChange={(e) => s.set('eshelEnabled', e.target.checked)} />
                Réclamer l'indemnité eshel (sans frais de logement)
              </label>
              {s.eshelEnabled && (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <Field label="Jours entiers à l'étranger">
                    <input type="number" min={0} className={inputCls} value={s.eshelDays} onChange={(e) => s.set('eshelDays', Number(e.target.value))} />
                  </Field>
                  <Field label="Pays">
                    <select className={inputCls} value={s.eshelCountry} onChange={(e) => s.set('eshelCountry', e.target.value)}>
                      {COUNTRIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </Field>
                  <p className="col-span-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 ${isExpensiveCountry(s.eshelCountry) ? 'bg-metric text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>
                      {isExpensiveCountry(s.eshelCountry) ? 'Majoré +25%' : 'Standard'}
                    </span>
                  </p>
                </div>
              )}
            </Card>

            <Card title="Dépenses et déductions manuelles">
              {s.manualDeductions.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">Aucune déduction manuelle.</p>
              )}
              <div className="flex flex-col gap-2">
                {s.manualDeductions.map((d) => (
                  <div key={d.id} className="flex gap-2">
                    <input className={`${inputCls} flex-1`} value={d.label}
                      onChange={(e) => s.updateDeduction(d.id, { label: e.target.value })} />
                    <input type="number" className={`${inputCls} w-32`} value={d.amount}
                      onChange={(e) => s.updateDeduction(d.id, { amount: Number(e.target.value) })} />
                    <button onClick={() => s.removeDeduction(d.id)} className="rounded-md border border-red-300 px-3 text-red-600 dark:border-red-800">✕</button>
                  </div>
                ))}
              </div>
              <button onClick={s.addDeduction} className="mt-3 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
                + Ajouter une déduction
              </button>
            </Card>
          </div>

          {/* Colonne résultats */}
          <div className="flex flex-col gap-6">
            <ResultsPanel result={result} />

            <section className="flex flex-wrap gap-3 print:hidden">
              <button onClick={printReport} className="rounded-md bg-slate-800 px-4 py-2 text-sm text-white dark:bg-slate-200 dark:text-slate-900">
                Imprimer / PDF
              </button>
              <button onClick={handleEmail} className="rounded-md bg-bituah px-4 py-2 text-sm text-white">
                Email (Outlook)
              </button>
              <button onClick={s.reset} className="rounded-md border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">
                Réinitialiser
              </button>
            </section>

            <footer className="rounded-card border border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
              Cet outil fournit une <strong>estimation indicative</strong>. Il ne remplace pas
              l'avis d'un comptable agréé (רואה חשבון) ou d'un conseiller fiscal (יועץ מס). Les
              calculs sont basés sur les règles publiées par רשות המסים et ביטוח לאומי mais peuvent
              contenir des erreurs ou ne pas refléter votre situation particulière. Certaines
              valeurs (taux Bituah, eshel, change de repli) restent à vérifier sur les sources
              officielles. Pour une déclaration fiscale réelle, consultez un professionnel.
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
