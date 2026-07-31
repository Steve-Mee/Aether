/**
 * Strip common PII / secrets from log context objects.
 * Prefer structured IDs over emails, tokens, or free-text customer fields.
 */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const BEARER_RE = /\b(Bearer|Preview)\s+\S+/gi;

const SENSITIVE_KEYS = new Set([
  'email',
  'customerEmail',
  'firstName',
  'lastName',
  'phone',
  'password',
  'token',
  'previewToken',
  'authorization',
  'clientSecret',
  'shippingAddress',
  'address',
  'apiKey',
]);

export function sanitizePiiForLogs(
  context: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEYS.has(key)) {
      out[key] = '[redacted]';
      continue;
    }
    if (typeof value === 'string') {
      out[key] = value
        .replace(EMAIL_RE, '[email-redacted]')
        .replace(BEARER_RE, '$1 [redacted]');
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = sanitizePiiForLogs(value as Record<string, unknown>);
      continue;
    }
    out[key] = value;
  }
  return out;
}
