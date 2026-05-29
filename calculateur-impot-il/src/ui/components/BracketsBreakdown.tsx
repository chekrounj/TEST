import type { TaxResult } from '@/types';
import { ils, pct } from '@/ui/shared/format';

/** Table du détail de l'impôt sur le revenu, tranche par tranche. */
export function BracketsBreakdown({ result }: { result: TaxResult }) {
  if (result.breakdown.length === 0) {
    return (
      <p className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
        Aucun impôt sur le revenu (revenu imposable nul).
      </p>
    );
  }

  return (
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
            <td className="px-5 py-2">{ils(b.from)}</td>
            <td className="px-5 py-2">{ils(b.to)}</td>
            <td className="px-5 py-2">{pct(b.rate)}</td>
            <td className="px-5 py-2 text-right">{ils(b.tax)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-slate-200 font-semibold dark:border-slate-700">
          <td className="px-5 py-2" colSpan={3}>
            Total impôt brut
          </td>
          <td className="px-5 py-2 text-right">{ils(result.totalTax)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
