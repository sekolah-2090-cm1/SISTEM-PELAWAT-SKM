/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_SHEET_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
