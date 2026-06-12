import { t } from '@/lib/i18n';

export type ErrorKind =
  | 'network'
  | 'timeout'
  | 'validation'
  | 'auth'
  | 'rate_limit'
  | 'server'
  | 'unknown';

export function statusToKind(status: number): ErrorKind {
  if (status === 401 || status === 403) return 'auth';
  if (status === 400 || status === 422) return 'validation';
  if (status === 408) return 'timeout';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'server';
  return 'unknown';
}

export function isRetryableKind(kind: ErrorKind): boolean {
  return kind === 'network' || kind === 'timeout' || kind === 'rate_limit' || kind === 'server';
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export class ApiError extends Error {
  readonly status: number;
  readonly kind: ErrorKind;
  readonly code?: string;
  readonly body?: unknown;
  readonly isAuthError: boolean;

  constructor(message: string, status: number, options?: { code?: string; body?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = statusToKind(status);
    this.code = options?.code;
    this.body = options?.body;
    this.isAuthError = this.kind === 'auth';
  }
}

export class NetworkError extends Error {
  readonly kind: ErrorKind = 'network';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'NetworkError';
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export function isNetworkError(err: unknown): err is NetworkError {
  return err instanceof NetworkError;
}

export interface ClassifiedError {
  kind: ErrorKind;
  retryable: boolean;
  status?: number;
}

const REPORTABLE_KINDS: ReadonlySet<ErrorKind> = new Set([
  'network',
  'timeout',
  'rate_limit',
  'server',
  'unknown',
]);

/** Whether an error should be sent to Sentry / external monitoring. */
export function shouldReportError(err: unknown): boolean {
  const { kind } = classifyError(err);
  return REPORTABLE_KINDS.has(kind);
}

export function classifyError(err: unknown): ClassifiedError {
  if (isApiError(err)) {
    return {
      kind: err.kind,
      retryable: isRetryableKind(err.kind),
      status: err.status,
    };
  }
  if (isNetworkError(err)) {
    return { kind: 'network', retryable: true };
  }
  if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
    return { kind: 'network', retryable: true };
  }
  return { kind: 'unknown', retryable: false };
}

export function toUserMessage(err: unknown): string {
  const { kind } = classifyError(err);
  switch (kind) {
    case 'auth':
      return t('api.error.auth');
    case 'server':
      return t('api.error.server');
    case 'network':
      return t('api.error.network');
    case 'timeout':
      return t('api.error.timeout');
    case 'validation':
      return isApiError(err) ? err.message : t('api.error.validation');
    case 'rate_limit':
      return t('api.error.rate_limit');
    default:
      break;
  }
  if (isApiError(err)) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
