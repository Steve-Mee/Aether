/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_USE_MOCK: string;
  readonly VITE_DATA_SOURCE: string;
  readonly VITE_AETHER_API_KEY: string;
  readonly VITE_AETHER_TENANT: string;
  readonly VITE_SUPPLIERS_DEMO: string;
  readonly VITE_LIVE_DEMO: string;
  readonly VITE_HYBRID_DEMO: string;
  readonly VITE_MERCHANT_DISPLAY_NAME: string;
  readonly VITE_AUTH_PROVIDER: string;
  readonly VITE_AUTH_AUTO_LOGIN: string;
  readonly VITE_LOG_LEVEL: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_SENTRY_ENV: string;
  readonly VITE_SENTRY_DEV: string;
  readonly VITE_SENTRY_REPLAY_ENABLED: string;
  readonly VITE_SENTRY_REPLAY_SESSION_RATE: string;
  readonly VITE_SENTRY_REPLAY_ERROR_RATE: string;
  readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
