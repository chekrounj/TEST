import { useMemo, type ReactNode } from 'react';
import type { CalculationInput, Currency } from '@/types';
import { useCalculatorStore } from '@/store/calculatorStore';
import { useFxRates } from '@/hooks/useFxRates';
import { calculate } from '@/domain/orchestrator';
import { SELECTABLE_YEARS, isProvisionalYear } from '@/domain/tax/rules';
import { getFallbackRate } from '@/domain/fx/providers';
import { countWorkdays } from '@/domain/workdays/counter';
import { getIsraeliHolidays } from '@/domain/workdays/holidays';
import { COUNTRIES, isExpensiveCountry } from '@/domain/eshel/countries';
import { ResultsPanel } from '@/ui/components/ResultsPanel';
import { CalcInput } from '@/ui/components/CalcInput';
import { DateInput } from '@/ui/components/DateInput';
import { ils } from '@/ui/shared/format';
import { emailReport } from '@/services/email';
import { printReport } from '@/services/print';

const CURRENCIES: Currency[] = ['ILS', 'USD', 'EUR', 'GBP', 'CHF'];

// Fond + texte explicites : évite l'effet « blanc sur blanc » des menus
// déroulants natifs (les <option> héritaient d'un fond transparent).
const inputCls =
  'rounded-md border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

/** Nombre de jours calendaires entre deux dates ISO (bornes incluses). */
function calendarDays(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms)) return 0;
  const d = Math.round(ms / 86_400_000) + 1;
  return d > 0 ? d : 0;
}

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

  // Taux de change effectifs : automatiques ou saisis manuellement.
  const incomeRate = s.fxManualEnabled ? s.fxManualRate : fx.income.rate;
  const incomeSource = s.fxManualEnabled ? 'manuel' : fx.income.source;
  const usdRate =
    s.fxManualEnabled && s.currency === 'USD' ? s.fxManualRate : fx.usd.rate;

  // Décompte automatique des jours ouvrés (ou valeur manuelle). En mode
  // mensuel, l'option « estimer à l'année » compte l'année civile entière.
  const workTotal = useMemo(() => {
    if (!s.autoWorkdays) return s.workTotal;
    const fullYear = s.periodMode === 'monthly' && s.annualizeWorkdays;
    const start = fullYear ? `${s.year}-01-01` : s.startDate;
    const end = fullYear ? `${s.year}-12-31` : s.endDate;
    const holidays = s.calendar === 'israel' ? getIsraeliHolidays(s.year) : [];
    return countWorkdays({ startDate: start, endDate: end, calendar: s.calendar, holidays }).totalWorkdays;
  }, [s.autoWorkdays, s.workTotal, s.calendar, s.year, s.startDate, s.endDate, s.periodMode, s.annualizeWorkdays]);

  // Périodes de voyage : jours ouvrés + jours calendaires par période.
  const travelComputed = useMemo(() => {
    const holidays = s.calendar === 'israel' ? getIsraeliHolidays(s.year) : [];
    return s.travelPeriods.map((p) => ({
      ...p,
      workdays: countWorkdays({
        startDate: p.startDate,
        endDate: p.endDate,
        calendar: s.calendar,
        holidays,
      }).totalWorkdays,
      calDays: calendarDays(p.startDate, p.endDate),
    }));
  }, [s.travelPeriods, s.calendar, s.year]);

  const hasTravel = s.travelPeriods.length > 0;
  const abroadFromTravel = travelComputed.reduce((a, t) => a + t.workdays, 0);
  const workAbroad = s.autoAbroad && hasTravel ? abroadFromTravel : s.workAbroad;

  // Segments eshel : un par période de voyage (jours calendaires × pays).
  const eshelSegments = hasTravel
    ? travelComputed.map((t) => ({ daysAbroad: t.calDays, country: t.country }))
    : undefined;

  // Revenus multi-devises : chaque ligne est convertie en ILS et sommée avec le revenu principal.
  const extraLinesILS = useMemo(() => {
    return s.extraIncomeLines.map((l) => {
      const rate = l.fxManualEnabled
        ? l.fxManualRate
        : (l.currency === 'ILS' ? 1 : getFallbackRate(l.currency, s.year));
      return { ...l, rate, amountILS: l.amount * rate };
    });
  }, [s.extraIncomeLines, s.year]);

  const primaryILS = s.amount * incomeRate;
  const extraTotalILS = extraLinesILS.reduce((sum, l) => sum + l.amountILS, 0);
  const totalPeriodILS = primaryILS + extraTotalILS;

  const input: CalculationInput = {
    year: s.year,
    status: s.status,
    period: { mode: s.periodMode, months: s.periodMonths },
    // Revenu total pré-converti en ILS (somme de toutes les devises).
    income: { amount: totalPeriodILS, currency: 'ILS' },
    incomeFxRate: 1,
    usdFxRate: usdRate,
    workdays: { total: workTotal, abroad: workAbroad },
    eshel: {
      enabled: s.eshelEnabled,
      daysAbroad: s.eshelDays,
      country: s.eshelCountry,
      segments: eshelSegments,
    },
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
      'Pièce jointe : le rapport PDF que vous venez d\'enregistrer (à joindre au message).',
      '',
      'Estimation indicative — ne remplace pas un comptable agréé (רואה חשבון).',
    ];
    emailReport({ subject: `Estimation impôt ${s.year}`, body: lines.join('\n'), withPdf: true });
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
              USD/ILS {usdRate.toFixed(2)} · {s.fxManualEnabled && s.currency === 'USD' ? 'manuel' : fx.usd.source}
            </span>
            {s.currency !== 'ILS' && s.currency !== 'USD' && (
              <span className="rounded-full bg-slate-200 px-3 py-1 dark:bg-slate-800">
                {s.currency}/ILS {incomeRate.toFixed(2)} · {incomeSource}
              </span>
            )}
            {fx.loading && !s.fxManualEnabled && <span className="text-slate-400">maj…</span>}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Colonne saisie */}
          <div className="flex flex-col gap-6">
            <Card title="Paramètres généraux">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Année fiscale">
                  <select className={inputCls} value={s.year} onChange={(e) => s.set('year', Number(e.target.value))}>
                    {SELECTABLE_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}{isProvisionalYear(y) ? ' (provisoire)' : ''}
                      </option>
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
              {isProvisionalYear(s.year) && (
                <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  Année <strong>{s.year}</strong> provisoire : barème officiel non
                  encore publié. Calcul basé sur les tranches de l'année précédente
                  et le dernier taux de change connu.
                </p>
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
                  <CalcInput
                    value={s.amount}
                    onChange={(v) => s.set('amount', v)}
                    min={0}
                    className={inputCls}
                    formatResult={(v) => `${Math.round(v).toLocaleString('fr-FR')} ${s.currency}`}
                  />
                </Field>
              </div>
              {s.currency !== 'ILS' && (
                <>
                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={s.fxManualEnabled}
                      onChange={(e) => s.set('fxManualEnabled', e.target.checked)}
                    />
                    Saisir le cours de la devise manuellement
                  </label>
                  {s.fxManualEnabled && (
                    <div className="mt-2">
                      <Field label={`Cours ${s.currency}/ILS (1 ${s.currency} = ? ₪)`}>
                        <CalcInput
                          value={s.fxManualRate}
                          onChange={(v) => s.set('fxManualRate', v)}
                          min={0}
                          className={inputCls}
                          formatResult={(v) => `${v.toFixed(4)} ₪`}
                        />
                      </Field>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Converti à {incomeRate.toFixed(3)} {s.currency}/ILS ({incomeSource})
                    → {ils(primaryILS)}
                  </p>
                </>
              )}
              {/* Récapitulatif si revenus multi-devises */}
              {s.extraIncomeLines.length > 0 && (
                <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Total revenus toutes devises :&nbsp;
                  <strong>{ils(totalPeriodILS)}</strong>
                  {s.periodMode === 'monthly' ? ' /mois → ' + ils(totalPeriodILS * 12) + ' /an'
                   : s.periodMode === 'partial' ? ` sur ${s.periodMonths} mois → ` + ils(totalPeriodILS / s.periodMonths * 12) + ' /an annualisé'
                   : ''}
                </p>
              )}
            </Card>

            <Card title="Autres revenus (multi-devises)">
              {s.extraIncomeLines.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Ajoutez d'autres sources de revenus dans leur propre devise (salaire étranger, dividendes, location…).
                </p>
              )}
              <div className="flex flex-col gap-3">
                {extraLinesILS.map((l) => (
                  <div key={l.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Libellé">
                        <input
                          className={`${inputCls} col-span-2`}
                          value={l.label}
                          onChange={(e) => s.updateIncomeLine(l.id, { label: e.target.value })}
                        />
                      </Field>
                      <Field label="Devise">
                        <select className={inputCls} value={l.currency}
                          onChange={(e) => s.updateIncomeLine(l.id, { currency: e.target.value as Currency })}>
                          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </Field>
                      <Field label={`Montant (${s.periodMode === 'annual' ? 'annuel' : s.periodMode === 'monthly' ? 'mensuel' : 'période'})`}>
                        <CalcInput
                          value={l.amount}
                          onChange={(v) => s.updateIncomeLine(l.id, { amount: v })}
                          min={0}
                          className={inputCls}
                          formatResult={(v) => `${Math.round(v).toLocaleString('fr-FR')} ${l.currency}`}
                        />
                      </Field>
                      {l.currency !== 'ILS' && (
                        <>
                          <div className="col-span-2 flex items-center gap-2 text-sm">
                            <label className="flex items-center gap-2">
                              <input type="checkbox" checked={l.fxManualEnabled}
                                onChange={(e) => s.updateIncomeLine(l.id, { fxManualEnabled: e.target.checked })} />
                              Cours manuel
                            </label>
                            {l.fxManualEnabled && (
                              <CalcInput
                                value={l.fxManualRate}
                                onChange={(v) => s.updateIncomeLine(l.id, { fxManualRate: v })}
                                min={0}
                                className={`${inputCls} w-28`}
                                formatResult={(v) => `${v.toFixed(4)} ₪`}
                              />
                            )}
                          </div>
                          <p className="col-span-2 text-xs text-slate-500 dark:text-slate-400">
                            {l.rate.toFixed(3)} {l.currency}/ILS{l.fxManualEnabled ? ' (manuel)' : ' (repli)'}
                            {' → '}<strong>{ils(l.amountILS)}</strong>
                          </p>
                        </>
                      )}
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button onClick={() => s.removeIncomeLine(l.id)}
                        className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-600 dark:border-red-800">
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={s.addIncomeLine}
                className="mt-3 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
                + Ajouter un revenu
              </button>
            </Card>

            <Card title="Jours ouvrés et déplacements">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Début de période">
                  <DateInput className={inputCls} value={s.startDate} onChange={(v) => s.set('startDate', v)} />
                </Field>
                <Field label="Fin de période">
                  <DateInput className={inputCls} value={s.endDate} onChange={(v) => s.set('endDate', v)} />
                </Field>
                <Field label="Semaine ouvrée">
                  <select className={inputCls} value={s.calendar} onChange={(e) => s.set('calendar', e.target.value as 'israel' | 'foreign')}>
                    <option value="israel">Israël (dim–jeu)</option>
                    <option value="foreign">Étranger (lun–ven)</option>
                  </select>
                </Field>
                <Field label="Jours ouvrés à l'étranger">
                  {s.autoAbroad && hasTravel ? (
                    <input className={`${inputCls} opacity-70`} value={`${workAbroad} j (auto)`} readOnly />
                  ) : (
                    <CalcInput
                      value={s.workAbroad}
                      onChange={(v) => s.set('workAbroad', v)}
                      min={0}
                      integer
                      className={inputCls}
                      formatResult={(v) => `${v} j`}
                    />
                  )}
                </Field>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={s.autoWorkdays} onChange={(e) => s.set('autoWorkdays', e.target.checked)} />
                Calculer automatiquement le total des jours ouvrés (fêtes incluses)
              </label>
              {s.periodMode === 'monthly' && (
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={s.annualizeWorkdays}
                    onChange={(e) => s.set('annualizeWorkdays', e.target.checked)}
                  />
                  Estimer les jours ouvrés sur l'année entière (mode mensuel ×12)
                </label>
              )}
              {!s.autoWorkdays && (
                <div className="mt-3">
                  <Field label="Total jours ouvrés (manuel)">
                    <CalcInput
                      value={s.workTotal}
                      onChange={(v) => s.set('workTotal', v)}
                      min={0}
                      integer
                      className={inputCls}
                      formatResult={(v) => `${v} j`}
                    />
                  </Field>
                </div>
              )}
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Total jours ouvrés retenu : <strong>{workTotal}</strong> · jours à l'étranger{' '}
                <strong>{workAbroad}</strong> · prorata étranger{' '}
                {workTotal > 0 ? ((workAbroad / workTotal) * 100).toFixed(1) : '0'} %
              </p>
            </Card>

            <Card title="Périodes de voyage">
              {!hasTravel && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Aucune période de voyage. Ajoutez vos missions à l'étranger : les
                  jours ouvrés et l'eshel sont calculés sur l'ensemble des périodes.
                </p>
              )}
              <div className="flex flex-col gap-3">
                {travelComputed.map((p) => (
                  <div key={p.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Début">
                        <DateInput className={inputCls} value={p.startDate} onChange={(v) => s.updateTravelPeriod(p.id, { startDate: v })} />
                      </Field>
                      <Field label="Fin">
                        <DateInput className={inputCls} value={p.endDate} onChange={(v) => s.updateTravelPeriod(p.id, { endDate: v })} />
                      </Field>
                      <Field label="Pays">
                        <select className={inputCls} value={p.country} onChange={(e) => s.updateTravelPeriod(p.id, { country: e.target.value })}>
                          {COUNTRIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                      </Field>
                      <div className="flex items-end justify-between gap-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {p.calDays} j · {p.workdays} ouvrés
                          {isExpensiveCountry(p.country) ? ' · +25%' : ''}
                        </p>
                        <button onClick={() => s.removeTravelPeriod(p.id)} className="rounded-md border border-red-300 px-3 py-1 text-red-600 dark:border-red-800">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={s.addTravelPeriod} className="mt-3 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
                + Ajouter une période de voyage
              </button>
              {hasTravel && (
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={s.autoAbroad} onChange={(e) => s.set('autoAbroad', e.target.checked)} />
                  Déduire automatiquement les jours ouvrés à l'étranger ({abroadFromTravel} j)
                </label>
              )}
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
              {s.eshelEnabled && hasTravel && (
                <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Eshel calculé automatiquement à partir des {s.travelPeriods.length} période(s)
                  de voyage (jours et pays de chaque période).
                  {result.eshel ? ` Total : ${result.eshel.daysAbroad} j → ${ils(result.eshel.totalILS)}.` : ''}
                </p>
              )}
              {s.eshelEnabled && !hasTravel && (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <Field label="Jours entiers à l'étranger">
                    <CalcInput
                      value={s.eshelDays}
                      onChange={(v) => s.set('eshelDays', v)}
                      min={0}
                      integer
                      className={inputCls}
                      formatResult={(v) => `${v} j`}
                    />
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
                    <CalcInput
                      value={d.amount}
                      onChange={(v) => s.updateDeduction(d.id, { amount: v })}
                      min={0}
                      className={`${inputCls} w-32`}
                      formatResult={ils}
                    />
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
                Email + PDF (Outlook)
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
