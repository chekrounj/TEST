/**
 * Service Microsoft 365 — envoi d'email authentifié via Microsoft Graph.
 *
 * TODO (Phase 2, optionnel) : nécessite l'enregistrement d'une application
 * dans Azure Portal (App Registration), les permissions `Mail.Send`/`User.Read`,
 * et la variable d'environnement VITE_AZURE_CLIENT_ID. L'authentification se
 * fait via @azure/msal-browser (PublicClientApplication), puis appel à
 * https://graph.microsoft.com/v1.0/me/sendMail avec le PDF en pièce jointe.
 *
 * Tant que ce n'est pas configuré, l'application utilise le deeplink Outlook
 * (services/outlook.ts), qui fonctionne sans aucun réglage.
 */

/** Indique si l'intégration Microsoft 365 est activée et configurée. */
export function isM365Configured(): boolean {
  return (
    import.meta.env?.VITE_ENABLE_M365 === 'true' &&
    Boolean(import.meta.env?.VITE_AZURE_CLIENT_ID)
  );
}

export async function sendEmailViaGraph(): Promise<never> {
  throw new Error(
    "Microsoft 365 non configuré. Renseignez VITE_AZURE_CLIENT_ID et installez " +
      "@azure/msal-browser pour activer l'envoi authentifié (cf. README).",
  );
}
