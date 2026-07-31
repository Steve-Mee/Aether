import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { MediaStorePort, StoredMediaFile } from '../../application/ports/MediaStorePort';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export function resolveMediaUploadDir(): string {
  return process.env.MEDIA_UPLOAD_DIR || path.join(process.cwd(), 'data', 'media');
}

/** Resolve a tenant-scoped media file path; returns null on traversal / invalid name. */
export function resolveSafeMediaAbsolutePath(
  rootDir: string,
  tenantId: string,
  fileName: string
): string | null {
  if (!tenantId || !fileName) return null;
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) return null;
  if (tenantId.includes('..') || tenantId.includes('/') || tenantId.includes('\\')) return null;

  const root = path.resolve(rootDir);
  const absolute = path.resolve(root, tenantId, fileName);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (!absolute.startsWith(prefix)) return null;
  return absolute;
}

export function guessMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

export class LocalDiskMediaStore implements MediaStorePort {
  constructor(private readonly rootDir: string = resolveMediaUploadDir()) {}

  async save(
    tenantId: string,
    filename: string,
    mimeType: string,
    content: Buffer
  ): Promise<StoredMediaFile> {
    const tid = requireTenantId(tenantId, 'LocalDiskMediaStore.save');
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'upload.bin';
    const key = `${tid}/${randomUUID()}-${safeName}`;
    const absolutePath = path.join(this.rootDir, key);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content);
    return {
      key,
      url: `/api/media/${key}`,
      mimeType,
      absolutePath,
    };
  }
}
