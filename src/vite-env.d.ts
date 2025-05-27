/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_SHOW_FOOTER?: string
  readonly VITE_DEBUG_DATETIME?: string
  readonly VITE_WINDOW_SCALE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
