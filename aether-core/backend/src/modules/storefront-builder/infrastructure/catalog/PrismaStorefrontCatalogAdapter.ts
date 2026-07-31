import { PrismaClient } from '@prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import {
  StorefrontCatalogListOptions,
  StorefrontCatalogListResult,
  StorefrontCatalogPort,
  StorefrontCatalogProduct,
} from '../../application/ports/StorefrontCatalogPort';

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  status: string;
  variants: Array<{
    id: string;
    sku: string;
    price: number;
    currency: string;
    stock: number;
  }>;
  media: Array<{
    mediaAsset: { url: string };
  }>;
};

/**
 * Public storefront catalog reads from Core Product tables (tenant-scoped).
 */
export class PrismaStorefrontCatalogAdapter implements StorefrontCatalogPort {
  constructor(private readonly prisma: PrismaClient) {}

  async listProducts(
    tenantId: string,
    opts?: StorefrontCatalogListOptions
  ): Promise<StorefrontCatalogListResult> {
    const tid = requireTenantId(tenantId, 'PrismaStorefrontCatalogAdapter.listProducts');
    const limit = Math.min(Math.max(opts?.limit ?? 24, 1), 100);
    const cursor = opts?.cursor?.trim() || null;

    const rows = await this.prisma.product.findMany({
      where: {
        tenantId: tid,
        status: 'active',
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { id: 'desc' },
      take: limit + 1,
      include: {
        variants: true,
        media: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
          include: { mediaAsset: true },
        },
      },
    });

    const page = rows.slice(0, limit) as ProductRow[];
    const nextCursor = rows.length > limit ? page[page.length - 1]?.id ?? null : null;

    return {
      products: page.map((r) => this.toProduct(r, false)),
      nextCursor,
    };
  }

  async getProductBySlug(
    tenantId: string,
    slug: string
  ): Promise<StorefrontCatalogProduct | null> {
    const tid = requireTenantId(tenantId, 'PrismaStorefrontCatalogAdapter.getProductBySlug');
    const row = await this.prisma.product.findUnique({
      where: { tenantId_slug: { tenantId: tid, slug } },
      include: {
        variants: true,
        media: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
          include: { mediaAsset: true },
        },
      },
    });
    if (!row || row.status !== 'active') return null;
    return this.toProduct(row as ProductRow, true);
  }

  async getProductById(
    tenantId: string,
    productId: string
  ): Promise<StorefrontCatalogProduct | null> {
    const tid = requireTenantId(tenantId, 'PrismaStorefrontCatalogAdapter.getProductById');
    const row = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: tid },
      include: {
        variants: true,
        media: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
          include: { mediaAsset: true },
        },
      },
    });
    if (!row || row.status !== 'active') return null;
    return this.toProduct(row as ProductRow, true);
  }

  async decrementStock(
    tenantId: string,
    lines: Array<{ productId: string; variantId?: string | null; quantity: number }>
  ): Promise<void> {
    const tid = requireTenantId(tenantId, 'PrismaStorefrontCatalogAdapter.decrementStock');
    await this.prisma.$transaction(async (tx) => {
      for (const line of lines) {
        if (line.quantity <= 0) continue;
        if (line.variantId) {
          await tx.productVariant.updateMany({
            where: { id: line.variantId, productId: line.productId },
            data: { stock: { decrement: line.quantity } },
          });
        }
        await tx.product.updateMany({
          where: { id: line.productId, tenantId: tid },
          data: { stock: { decrement: line.quantity } },
        });
      }
    });
  }

  private toProduct(row: ProductRow, includeVariants: boolean): StorefrontCatalogProduct {
    const currency = row.variants[0]?.currency ?? 'EUR';
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      price: row.price,
      currency,
      stock: row.stock,
      imageUrl: row.media[0]?.mediaAsset.url ?? null,
      status: row.status,
      ...(includeVariants
        ? {
            variants: row.variants.map((v) => ({
              id: v.id,
              sku: v.sku,
              price: v.price,
              currency: v.currency,
              stock: v.stock,
            })),
          }
        : {}),
    };
  }
}
