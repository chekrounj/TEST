/**
 * Service d'envoi par email avec rapport PDF.
 *
 * Limite technique (application web sans backend) : un navigateur ne peut pas
 * attacher automatiquement un fichier à un brouillon Outlook. La meilleure
 * approche côté client est donc en deux temps :
 *   1. déclencher l'impression → l'utilisateur enregistre le rapport en PDF ;
 *   2. ouvrir le brouillon Outlook (Office 365) pré-rempli, où il joint le PDF.
 *
 * Pour une pièce jointe 100 % automatique, voir services/microsoft365.ts
 * (Microsoft Graph, Phase 2 — nécessite une authentification Azure).
 */
import { printReport } from '@/services/print';
import { openOutlookCompose } from '@/services/outlook';

export interface EmailReportOptions {
  subject: string;
  body: string;
  to?: string;
  /** Déclenche l'impression PDF avant d'ouvrir le brouillon. */
  withPdf?: boolean;
}

/**
 * Prépare l'envoi d'un rapport par email. Si `withPdf`, ouvre d'abord la boîte
 * d'impression (pour enregistrer le PDF), puis le brouillon Outlook.
 */
export function emailReport({ subject, body, to, withPdf = true }: EmailReportOptions): void {
  if (withPdf) {
    // window.print() est bloquant : au retour, la boîte d'impression a été
    // fermée (PDF enregistré ou annulé). On ouvre ensuite le brouillon.
    printReport();
  }
  openOutlookCompose(subject, body, to);
}
