/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AZURE_CLIENT_ID: string;
  readonly VITE_BOI_API_BASE: string;
  readonly VITE_EXCHANGERATE_API_BASE: string;
  readonly VITE_HEBCAL_API_BASE: string;
  readonly VITE_DEFAULT_LOCALE: string;
  readonly VITE_ENABLE_M365: string;
  readonly VITE_ANALYTICS_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
