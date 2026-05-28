/**
 * Types TypeScript globaux du calculateur d'impôt israélien.
 *
 * Ces types décrivent les structures partagées entre les modules `domain/*`,
 * le store et l'UI. Les règles fiscales annuelles sont chargées depuis
 * `src/data/tax-rules-{year}.json` (voir `domain/tax/rules.ts`).
 */

/** Statut du contribuable. */
export type TaxpayerStatus = 'employee' | 'self';

/** Devises supportées (a minima). */
export type Currency = 'ILS' | 'USD' | 'EUR' | 'GBP' | 'CHF';

/**
 * Une tranche d'imposition annuelle.
 * `limit` est le plafond annuel en ILS de la tranche (null => dernière tranche,
 * sans plafond). `rate` est le taux marginal exprimé entre 0 et 1.
 */
export interface Bracket {
  limit: number | null;
  rate: number;
}

/** Détail d'une tranche effectivement utilisée dans un calcul. */
export interface BracketDetail {
  from: number;
  to: number;
  rate: number;
  taxedAmount: number;
  tax: number;
}

/** Résultat du calcul progressif de l'impôt sur le revenu. */
export interface TaxResult {
  totalTax: number;
  breakdown: BracketDetail[];
}

/** Taux Bituah Leumi + Briout pour un palier (bas / haut). */
export interface BituahTier {
  leumi: number;
  briout: number;
}

/** Bloc Bituah d'une année. */
export interface BituahRules {
  thresholdMonthly: number;
  maxMonthly: number;
  employee: { low: BituahTier; high: BituahTier };
  self: { low: BituahTier; high: BituahTier };
}

/** Cotisation retraite obligatoire des indépendants. */
export interface SelfPensionRules {
  lowRate: number;
  highRate: number;
}

/** Paramètres eshel (indemnité de mission sans frais de logement). */
export interface EshelRules {
  noLodgingUSDPerDay: number;
  surchargeRate: number;
}

/** Règles fiscales complètes d'une année. */
export interface TaxRules {
  year: number;
  source: string;
  lastVerified: string;
  verificationStatus?: Record<string, string>;
  brackets: Bracket[];
  pointValue: number;
  avgSalaryMonthly: number;
  bituah: BituahRules;
  selfPension: SelfPensionRules;
  eshel: EshelRules;
  fxFallback: Record<string, number>;
}
