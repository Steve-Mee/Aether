import type { CorsOptions } from 'cors';

const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

export function resolveCorsOrigins(): string[] {
  const raw = process.env.AETHER_CORS_ORIGINS;
  if (!raw || !raw.trim()) return DEFAULT_ORIGINS;
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function buildCorsOptions(): CorsOptions {
  const origins = resolveCorsOrigins();
  return {
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
  };
}
