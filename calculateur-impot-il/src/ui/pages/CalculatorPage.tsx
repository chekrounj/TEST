import { useMemo, useState } from 'react';
import { computeProgressiveTax } from '@/domain/tax/brackets';
import { applyPointsCredit } from '@/domain/tax/points';
import { getTaxRules, AVAILABLE_YEARS } from '@/domain/tax/rules';

const ils = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
});

/**
 * Page calculateur — version MVP (Phase 1).
 *
 * À ce stade, seul le module impôt sur le revenu (tranches + points de crédit)
 * est branché. Les sections jours ouvrés / eshel / Bituah / orchestrateur
 * seront ajoutées au fil des itérations (cf. roadmap).
 */
export function CalculatorPage() {
  const [year, setYear] = useState(2025);
  const [income, setIncome] = useState(200_000);
  const [points, setPoints] = useState(2.25);

  const rules = getTaxRules(year);
  const result = useMemo(
    () => computeProgressiveTax(income, rules.brackets),
    [income, rules],
  );
  const netTax = applyPointsCredit(result.totalTax, points, rules.pointValue);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Calculateur d'impôt israélien</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Estimation indicative — impôt sur le revenu (Phase 1)
          </p>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 rounded-card bg-white p-5 shadow-sm dark:bg-slate-900 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Année fiscale</span>
            <select
              className="rounded-md border border-slate-300 bg-transparent p-2 dark:border-slate-700"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Revenu imposable annuel (₪)</span>
            <input
              type="number"
              min={0}
              step={1000}
              className="rounded-md border border-slate-300 bg-transparent p-2 dark:border-slate-700"
              value={income}
              onChange={(e) => setIncome(Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Points de crédit</span>
            <input
              type="number"
              min={0}
              max={10}
              step={0.25}
              className="rounded-md border border-slate-300 bg-transparent p-2 dark:border-slate-700"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
            />
          </label>
        </section>

        <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Metric label="Impôt brut" value={ils.format(result.totalTax)} />
          <Metric
            label={`Crédit ${points} pts`}
            value={'− ' + ils.format(result.totalTax - netTax)}
          />
          <Metric label="Impôt net annuel" value={ils.format(netTax)} accent />
        </section>

        <section className="mb-6 overflow-hidden rounded-card bg-white shadow-sm dark:bg-slate-900">
          <h2 className="border-b border-slate-200 px-5 py-3 font-semibold dark:border-slate-800">
            Détail par tranche
          </h2>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-2">De</th>
                <th className="px-5 py-2">À</th>
                <th className="px-5 py-2">Taux</th>
                <th className="px-5 py-2 text-right">Impôt</th>
              </tr>
            </thead>
            <tbody>
              {result.breakdown.map((b, i) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-5 py-2">{ils.format(b.from)}</td>
                  <td className="px-5 py-2">{ils.format(b.to)}</td>
                  <td className="px-5 py-2">{(b.rate * 100).toFixed(0)} %</td>
                  <td className="px-5 py-2 text-right">{ils.format(b.tax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="rounded-card border border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
          Cet outil fournit une <strong>estimation indicative</strong>. Il ne
          remplace pas l'avis d'un comptable agréé (רואה חשבון) ou d'un
          conseiller fiscal (יועץ מס). Les calculs sont basés sur les règles
          publiées par רשות המסים et ביטוח לאומי mais peuvent contenir des
          erreurs ou ne pas refléter votre situation particulière. Pour une
          déclaration fiscale réelle, consultez un professionnel.
        </footer>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        'rounded-card p-4 shadow-sm ' +
        (accent
          ? 'bg-metric text-white'
          : 'bg-white dark:bg-slate-900')
      }
    >
      <div className={'text-xs ' + (accent ? 'text-white/80' : 'text-slate-500 dark:text-slate-400')}>
        {label}
      </div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}
