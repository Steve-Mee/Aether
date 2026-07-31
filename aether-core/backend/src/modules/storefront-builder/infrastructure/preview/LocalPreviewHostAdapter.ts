import {
  PreviewHostPort,
  StartPreviewInput,
  StartPreviewResult,
} from '../../application/ports/PreviewHostPort';
import {
  PREVIEW_TOKEN_TTL_MS,
  signPreviewToken,
} from '../../application/services/previewToken';

/** Locked Appendix G / P08 default for storefront-runtime + admin iframe. */
export const DEFAULT_STOREFRONT_PREVIEW_PORT = 4177;

/**
 * Local preview host for storefront-runtime (P09).
 * Does not spin a process — returns a signed URL the runtime can serve.
 */
export function resolveStorefrontPreviewPort(
  env: NodeJS.ProcessEnv = process.env
): number {
  const raw = env.STOREFRONT_PREVIEW_PORT?.trim();
  if (!raw) return DEFAULT_STOREFRONT_PREVIEW_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return DEFAULT_STOREFRONT_PREVIEW_PORT;
  }
  return port;
}

export function buildPreviewUrl(input: {
  revisionId: string;
  token: string;
  port?: number;
  host?: string;
}): string {
  const port = input.port ?? resolveStorefrontPreviewPort();
  const host = input.host ?? 'localhost';
  const token = encodeURIComponent(input.token);
  return `http://${host}:${port}/preview/${input.revisionId}?token=${token}`;
}

export class LocalPreviewHostAdapter implements PreviewHostPort {
  constructor(
    private readonly opts?: {
      port?: number;
      host?: string;
      ttlMs?: number;
      nowMs?: () => number;
    }
  ) {}

  async startPreview(input: StartPreviewInput): Promise<StartPreviewResult> {
    if (!input.tenantId?.trim()) {
      throw new Error('tenantId is required for preview host');
    }
    if (!input.projectId?.trim()) {
      throw new Error('projectId is required for preview host');
    }
    if (!input.revisionId?.trim()) {
      throw new Error('revisionId is required for preview host');
    }

    const nowMs = this.opts?.nowMs?.() ?? Date.now();
    const ttlMs = this.opts?.ttlMs ?? PREVIEW_TOKEN_TTL_MS;
    const expiresAt = new Date(nowMs + ttlMs);
    const token = signPreviewToken(
      {
        revisionId: input.revisionId,
        projectId: input.projectId,
        tenantId: input.tenantId,
      },
      { ttlMs, nowMs }
    );

    return {
      previewUrl: buildPreviewUrl({
        revisionId: input.revisionId,
        token,
        port: this.opts?.port ?? resolveStorefrontPreviewPort(),
        host: this.opts?.host,
      }),
      expiresAt,
    };
  }
}
