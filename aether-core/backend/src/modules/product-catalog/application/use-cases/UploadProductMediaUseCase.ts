import { ProductRepository } from '../../domain/repositories/ProductRepository';
import type { MediaStorePort } from '../ports/MediaStorePort';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class UploadProductMediaUseCase {
  constructor(
    private repo: ProductRepository,
    private mediaStore: MediaStorePort
  ) {}

  async execute(
    tenantId: string,
    productId: string,
    input: { filename: string; mimeType: string; contentBase64: string; alt?: string }
  ) {
    const tid = requireTenantId(tenantId, 'UploadProductMediaUseCase.execute');
    const buffer = Buffer.from(input.contentBase64, 'base64');
    if (buffer.length === 0) {
      throw new Error('Empty media content');
    }
    if (buffer.length > 5 * 1024 * 1024) {
      throw new Error('Media exceeds 5MB limit');
    }
    const stored = await this.mediaStore.save(tid, input.filename, input.mimeType, buffer);
    return this.repo.addMedia(productId, tid, {
      key: stored.key,
      url: stored.url,
      mimeType: stored.mimeType,
      alt: input.alt ?? null,
    });
  }
}
