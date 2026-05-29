/**
 * Service Outlook — deeplink de composition d'email (sans authentification).
 *
 * Limite : ~2000 caractères dans l'URL, pas de pièce jointe. Pour un envoi
 * authentifié avec PDF en pièce jointe, voir services/microsoft365.ts.
 */

/** Domaine Office 365 / Outlook (nouvelle expérience cloud.microsoft). */
const OUTLOOK_BASE = 'https://outlook.cloud.microsoft/mail';

/** Construit l'URL de composition Outlook web (Office 365). */
export function buildOutlookDeeplink(subject: string, body: string, to?: string): string {
  const params = new URLSearchParams({
    subject,
    body,
    ...(to ? { to } : {}),
  });
  return `${OUTLOOK_BASE}/deeplink/compose?${params.toString()}`;
}

/** Ouvre Outlook web dans un nouvel onglet avec le message pré-rempli. */
export function openOutlookCompose(subject: string, body: string, to?: string): void {
  const url = buildOutlookDeeplink(subject, body, to);
  window.open(url, '_blank', 'noopener,noreferrer');
}
