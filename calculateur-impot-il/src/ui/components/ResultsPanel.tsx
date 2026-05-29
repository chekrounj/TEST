import type { CalculationResult } from '@/types';
import { ils, ils2, pct } from '@/ui/shared/format';
import { BracketsBreakdown } from '@/ui/components/BracketsBreakdown';

function Metric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'metric' | 'total';
}) {
  const bg =
    tone === 'total'
      ? 'bg-total text-white'
      : tone === 'metric'
        ? 'bg-metric text-white'
        : 'bg-white dark:bg-slate-900';
  const sub = tone ? 'text-white/70' : 'text-slate-500 dark:text-slate-400';
  return (
    <div className={`rounded-card p-4 shadow-sm ${bg}`}>
      <div className={`text-xs ${sub}`}>{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      {detail && <div className={`mt-0.5 text-xs ${sub}`}>{detail}</div>}
    </div>
  );
}

/** Panneau de résultats : métriques, Bituah, déductions et détail par tranche. */
export function ResultsPanel({ result }: { result: CalculationResult }) {
  const b = result.bituah;

  // Impôt : on affiche le BRUT (avant crédits) pour ne jamais écrire « 0 ₪ »
  // à tort. Le crédit de points et le net sont affichés en sous-texte.
  const taxBrut = result.incomeTax.totalTax;
  const taxDetail =
    result.pointsCredit > 0
      ? `crédit − ${ils(result.pointsCredit)} → net ${ils(result.incomeTaxAfterCredits)}`
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Metric label="Revenu annualisé" value={ils(result.annualizedIncome)} />
        <Metric label="Revenu imposable" value={ils(result.taxableFinal)} />
        <Metric label="Impôt sur le revenu" value={ils(taxBrut)} detail={taxDetail} />
        <Metric label="Bituah total" value={ils(b.total)} tone="metric" />
        <Metric label="TOTAL annuel" value={ils(result.totalAnnual)} tone="total" />
        <Metric label="TOTAL mensuel" value={ils2(result.totalMonthly)} tone="total" />
      </section>

      <section className="overflow-hidden rounded-card border-l-4 border-bituah bg-white shadow-sm dark:bg-slate-900">
        <h2 className="px-5 py-3 font-semibold">Bituah Leumi + Briout</h2>
        <div className="grid grid-cols-2 gap-px bg-slate-100 text-sm dark:bg-slate-800 sm:grid-cols-4">
          <Cell label="Leumi" value={ils(b.leumi)} />
          <Cell label="Briout" value={ils(b.briout)} />
          <Cell label="Total" value={ils(b.total)} />
          <Cell
            label="52% Leumi déductible"
            value={b.leumiDeductible > 0 ? ils(b.leumiDeductible) : '—'}
          />
        </div>
        <p className="px-5 py-2 text-xs text-slate-500 dark:text-slate-400">
          Seuil annuel {ils(b.breakdown.thresholdAnnual)} · plafond {ils(b.breakdown.maxAnnual)} ·
          portion basse {ils(b.breakdown.lowPortion)} · portion haute {ils(b.breakdown.highPortion)}
          {b.breakdown.cappedExcess > 0 && ` · au-delà du plafond ${ils(b.breakdown.cappedExcess)}`}
        </p>
      </section>

      {result.eshel && result.eshel.totalILS > 0 && (
        <section className="overflow-hidden rounded-card bg-white shadow-sm dark:bg-slate-900">
          <h2 className="border-b border-slate-200 px-5 py-3 font-semibold dark:border-slate-800">
            Détail du calcul eshel
          </h2>
          <div className="px-5 py-3 text-sm">
            <p className="text-slate-600 dark:text-slate-300">
              {result.eshel.daysAbroad} jour(s) ×{' '}
              {result.eshel.effectiveRatePerDay.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $/j
              {result.eshel.surcharge === 1.25 ? ' (majoré +25%)' : ''} ={' '}
              <strong>{result.eshel.totalUSD.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $</strong>
            </p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              Converti à {result.eshel.usdFxRate.toFixed(3)} USD/ILS →{' '}
              <strong>{ils(result.eshel.totalILS)}</strong>
            </p>
            {result.eshel.segments && result.eshel.segments.length > 1 && (
              <table className="mt-3 w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="py-1">Période</th>
                    <th className="py-1 text-right">Jours</th>
                    <th className="py-1 text-right">$/jour</th>
                    <th className="py-1 text-right">Total ₪</th>
                  </tr>
                </thead>
                <tbody>
                  {result.eshel.segments.map((seg, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1">
                        #{i + 1}
                        {seg.isExpensiveCountry ? ' (+25%)' : ''}
                      </td>
                      <td className="py-1 text-right">{seg.daysAbroad}</td>
                      <td className="py-1 text-right">
                        {seg.effectiveRatePerDay.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $
                      </td>
                      <td className="py-1 text-right">{ils(seg.totalILS)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-card bg-white shadow-sm dark:bg-slate-900">
        <h2 className="border-b border-slate-200 px-5 py-3 font-semibold dark:border-slate-800">
          Déductions appliquées
        </h2>
        {result.deductions.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
            Aucune déduction.
          </p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {result.deductions.map((d) => (
                <tr key={d.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-5 py-2">
                    {d.label}
                    {d.auto && (
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500 dark:bg-slate-800">
                        auto
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-2 text-right">{ils(d.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-semibold dark:border-slate-700">
                <td className="px-5 py-2">Total déductions</td>
                <td className="px-5 py-2 text-right">{ils(result.totalDeductions)}</td>
              </tr>
            </tfoot>
          </table>
        )}
        <p className="px-5 py-2 text-xs text-slate-500 dark:text-slate-400">
          Dispense prorata : {pct(result.prorata.ratio)} du revenu imposable provisoire{' '}
          ({ils(result.taxableProvisional)}) = {ils(result.prorata.deductionAmount)}
        </p>
      </section>

      <section className="overflow-hidden rounded-card bg-white shadow-sm dark:bg-slate-900">
        <h2 className="border-b border-slate-200 px-5 py-3 font-semibold dark:border-slate-800">
          Détail par tranche d'imposition
        </h2>
        <BracketsBreakdown result={result.incomeTax} />
        <p className="px-5 py-2 text-xs text-slate-500 dark:text-slate-400">
          Impôt brut {ils(taxBrut)}
          {result.pointsCredit > 0 && ` · crédit de points − ${ils(result.pointsCredit)} → net ${ils(result.incomeTaxAfterCredits)}`}
        </p>
      </section>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-3 dark:bg-slate-900">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
