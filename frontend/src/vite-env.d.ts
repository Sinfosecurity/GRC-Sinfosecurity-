/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string
    readonly VITE_PREVIEW_LABEL?: string
    readonly VITE_ENVIRONMENT?: string
    readonly VITE_ENABLE_LEGACY_GRC?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
