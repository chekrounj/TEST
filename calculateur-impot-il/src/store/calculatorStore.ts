/**
 * Store Zustand — état de saisie du calculateur, persisté dans localStorage.
 *
 * Le store ne contient que les **entrées** de l'utilisateur. Les taux de change
 * (hook useFxRates) et le résultat du calcul (orchestrateur) sont dérivés dans
 * l'UI à partir de cet état.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Currency, DeductionLine, IncomeLine, PeriodMode, TaxpayerStatus, TravelPeriod } from '@/types';

export interface CalculatorState {
  year: number;
  status: TaxpayerStatus;
  periodMode: PeriodMode;
  periodMonths: number;

  currency: Currency;
  amount: number;
  points: number;

  // Change manuel (override du taux automatique)
  fxManualEnabled: boolean;
  fxManualRate: number;

  // Jours ouvrés / déplacements
  startDate: string;
  endDate: string;
  calendar: 'israel' | 'foreign';
  autoWorkdays: boolean;
  workTotal: number;
  workAbroad: number;
  /** Estimer les jours ouvrés sur l'année entière (mode mensuel). */
  annualizeWorkdays: boolean;
  /** Déduire automatiquement les jours à l'étranger des périodes de voyage. */
  autoAbroad: boolean;
  /** Périodes de voyage / missions à l'étranger. */
  travelPeriods: TravelPeriod[];

  // Eshel
  eshelEnabled: boolean;
  eshelDays: number;
  eshelCountry: string;

  manualDeductions: DeductionLine[];

  /** Lignes de revenus supplémentaires (multi-devises). */
  extraIncomeLines: IncomeLine[];

  set: <K extends keyof CalculatorState>(key: K, value: CalculatorState[K]) => void;
  addDeduction: () => void;
  updateDeduction: (id: string, patch: Partial<Omit<DeductionLine, 'id' | 'auto'>>) => void;
  removeDeduction: (id: string) => void;
  addTravelPeriod: () => void;
  updateTravelPeriod: (id: string, patch: Partial<Omit<TravelPeriod, 'id'>>) => void;
  removeTravelPeriod: (id: string) => void;
  addIncomeLine: () => void;
  updateIncomeLine: (id: string, patch: Partial<Omit<IncomeLine, 'id'>>) => void;
  removeIncomeLine: (id: string) => void;
  reset: () => void;
}

const currentYear = new Date().getFullYear();
// Utilise l'année en cours si elle est dans la plage gérée (y compris les
// années provisoires), sinon la dernière année avec données (2025).
const defaultYear = currentYear >= 2022 ? currentYear : 2022;

const initialState = {
  year: defaultYear,
  status: 'employee' as TaxpayerStatus,
  periodMode: 'annual' as PeriodMode,
  periodMonths: 12,
  currency: 'ILS' as Currency,
  amount: 200_000,
  points: 2.25,
  fxManualEnabled: false,
  fxManualRate: 3.7,
  startDate: `${defaultYear}-01-01`,
  endDate: `${defaultYear}-12-31`,
  calendar: 'israel' as const,
  autoWorkdays: true,
  workTotal: 240,
  workAbroad: 0,
  annualizeWorkdays: false,
  autoAbroad: true,
  travelPeriods: [] as TravelPeriod[],
  eshelEnabled: false,
  eshelDays: 0,
  eshelCountry: 'USA',
  manualDeductions: [] as DeductionLine[],
  extraIncomeLines: [] as IncomeLine[],
};

let idCounter = 0;
const newId = () => `man-${Date.now()}-${idCounter++}`;

export const useCalculatorStore = create<CalculatorState>()(
  persist(
    (set) => ({
      ...initialState,

      set: (key, value) => set({ [key]: value } as Partial<CalculatorState>),

      addDeduction: () =>
        set((s) => ({
          manualDeductions: [
            ...s.manualDeductions,
            { id: newId(), label: 'Nouvelle déduction', amount: 0, auto: false },
          ],
        })),

      updateDeduction: (id, patch) =>
        set((s) => ({
          manualDeductions: s.manualDeductions.map((d) =>
            d.id === id ? { ...d, ...patch } : d,
          ),
        })),

      removeDeduction: (id) =>
        set((s) => ({
          manualDeductions: s.manualDeductions.filter((d) => d.id !== id),
        })),

      addTravelPeriod: () =>
        set((s) => ({
          travelPeriods: [
            ...s.travelPeriods,
            {
              id: newId(),
              startDate: s.startDate,
              endDate: s.startDate,
              country: s.eshelCountry,
            },
          ],
        })),

      updateTravelPeriod: (id, patch) =>
        set((s) => ({
          travelPeriods: s.travelPeriods.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        })),

      removeTravelPeriod: (id) =>
        set((s) => ({
          travelPeriods: s.travelPeriods.filter((p) => p.id !== id),
        })),

      addIncomeLine: () =>
        set((s) => ({
          extraIncomeLines: [
            ...s.extraIncomeLines,
            { id: newId(), label: 'Autre revenu', amount: 0, currency: 'USD' as Currency, fxManualEnabled: false, fxManualRate: 3.7 },
          ],
        })),

      updateIncomeLine: (id, patch) =>
        set((s) => ({
          extraIncomeLines: s.extraIncomeLines.map((l) =>
            l.id === id ? { ...l, ...patch } : l,
          ),
        })),

      removeIncomeLine: (id) =>
        set((s) => ({
          extraIncomeLines: s.extraIncomeLines.filter((l) => l.id !== id),
        })),

      reset: () => set({ ...initialState }),
    }),
    { name: 'calculateur-impot-il' },
  ),
);
