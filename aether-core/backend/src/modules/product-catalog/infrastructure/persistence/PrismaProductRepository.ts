import { PrismaClient } from '@prisma/client';
import { Product } from '../../domain/entities/Product';
import { ProductDetail, ProductMediaItem } from '../../domain/entities/ProductDetail';
import { ProductVariant } from '../../domain/entities/ProductVariant';
import {
  CreateVariantInput,
  ProductRepository,
  UpdateProductInput,
  UpdateVariantInput,
} from '../../domain/repositories/ProductRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

type PrismaProductRow = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  status: string;
  price: number;
  stock: number;
  seoTitle: string | null;
  seoDescription: string | null;
  categoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  variants?: Array<{
    id: string;
    productId: string;
    sku: string;
    price: number;
    currency: string;
    stock: number;
  }>;
  media?: Array<{
    id: string;
    mediaAssetId: string;
    sortOrder: number;
    alt: string | null;
    mediaAsset: { url: string; mimeType: string };
  }>;
};

export class PrismaProductRepository implements ProductRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(tenantId: string): Promise<ProductDetail[]> {
    const tid = requireTenantId(tenantId, 'PrismaProductRepository.findAll');
    const products = await this.prisma.product.findMany({
      where: { tenantId: tid },
      include: {
        variants: true,
        media: { include: { mediaAsset: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return products.map((p) => this.toDetail(p));
  }

  async findById(id: string, tenantId: string): Promise<ProductDetail | null> {
    const tid = requireTenantId(tenantId, 'PrismaProductRepository.findById');
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId: tid },
      include: {
        variants: true,
        media: { include: { mediaAsset: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    return product ? this.toDetail(product) : null;
  }

  async findBySlug(slug: string, tenantId: string): Promise<Product | null> {
    const tid = requireTenantId(tenantId, 'PrismaProductRepository.findBySlug');
    const product = await this.prisma.product.findUnique({
      where: { tenantId_slug: { tenantId: tid, slug } },
    });
    return product ? this.toLegacyProduct(product) : null;
  }

  async create(
    product: Product,
    tenantId: string,
    extras?: { price?: number; stock?: number }
  ): Promise<ProductDetail> {
    const tid = requireTenantId(tenantId, 'PrismaProductRepository.create');
    const created = await this.prisma.product.create({
      data: {
        tenantId: tid,
        name: product.name,
        description: product.description,
        slug: product.slug,
        price: extras?.price ?? 0,
        stock: extras?.stock ?? 0,
        status: product.status,
      },
      include: {
        variants: true,
        media: { include: { mediaAsset: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    return this.toDetail(created);
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateProductInput
  ): Promise<ProductDetail | null> {
    const tid = requireTenantId(tenantId, 'PrismaProductRepository.update');
    const existing = await this.prisma.product.findFirst({ where: { id, tenantId: tid } });
    if (!existing) return null;

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.stock !== undefined ? { stock: data.stock } : {}),
        ...(data.seoTitle !== undefined ? { seoTitle: data.seoTitle } : {}),
        ...(data.seoDescription !== undefined ? { seoDescription: data.seoDescription } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
      },
      include: {
        variants: true,
        media: { include: { mediaAsset: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    return this.toDetail(updated);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const tid = requireTenantId(tenantId, 'PrismaProductRepository.delete');
    const existing = await this.prisma.product.findFirst({ where: { id, tenantId: tid } });
    if (!existing) return false;
    await this.prisma.product.delete({ where: { id } });
    return true;
  }

  async listVariants(productId: string, tenantId: string): Promise<ProductVariant[]> {
    const tid = requireTenantId(tenantId, 'PrismaProductRepository.listVariants');
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: tid },
      include: { variants: true },
    });
    if (!product) return [];
    return product.variants.map((v) => this.toVariant(v));
  }

  async createVariant(
    productId: string,
    tenantId: string,
    data: CreateVariantInput
  ): Promise<ProductVariant | null> {
    const tid = requireTenantId(tenantId, 'PrismaProductRepository.createVariant');
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: tid },
    });
    if (!product) return null;
    const created = await this.prisma.productVariant.create({
      data: {
        productId,
        sku: data.sku,
        price: data.price,
        currency: data.currency ?? 'EUR',
        stock: data.stock ?? 0,
      },
    });
    return this.toVariant(created);
  }

  async updateVariant(
    productId: string,
    variantId: string,
    tenantId: string,
    data: UpdateVariantInput
  ): Promise<ProductVariant | null> {
    const tid = requireTenantId(tenantId, 'PrismaProductRepository.updateVariant');
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: tid },
    });
    if (!product) return null;
    const existing = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!existing) return null;
    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(data.sku !== undefined ? { sku: data.sku } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.stock !== undefined ? { stock: data.stock } : {}),
      },
    });
    return this.toVariant(updated);
  }

  async deleteVariant(
    productId: string,
    variantId: string,
    tenantId: string
  ): Promise<boolean> {
    const tid = requireTenantId(tenantId, 'PrismaProductRepository.deleteVariant');
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: tid },
    });
    if (!product) return false;
    const existing = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!existing) return false;
    await this.prisma.productVariant.delete({ where: { id: variantId } });
    return true;
  }

  async addMedia(
    productId: string,
    tenantId: string,
    asset: { key: string; url: string; mimeType: string; alt?: string | null }
  ): Promise<ProductDetail | null> {
    const tid = requireTenantId(tenantId, 'PrismaProductRepository.addMedia');
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: tid },
    });
    if (!product) return null;

    const mediaCount = await this.prisma.productMedia.count({ where: { productId } });
    const mediaAsset = await this.prisma.mediaAsset.create({
      data: {
        tenantId: tid,
        key: asset.key,
        url: asset.url,
        mimeType: asset.mimeType,
      },
    });
    await this.prisma.productMedia.create({
      data: {
        productId,
        mediaAssetId: mediaAsset.id,
        sortOrder: mediaCount,
        alt: asset.alt ?? null,
      },
    });
    return this.findById(productId, tid);
  }

  private toDetail(row: PrismaProductRow): ProductDetail {
    const media: ProductMediaItem[] = (row.media ?? []).map((m) => ({
      id: m.id,
      mediaAssetId: m.mediaAssetId,
      url: m.mediaAsset.url,
      mimeType: m.mediaAsset.mimeType,
      alt: m.alt,
      sortOrder: m.sortOrder,
    }));
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      slug: row.slug,
      status: row.status,
      price: row.price,
      stock: row.stock,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      categoryId: row.categoryId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      variants: (row.variants ?? []).map((v) => this.toVariant(v)),
      media,
    };
  }

  private toVariant(row: {
    id: string;
    productId: string;
    sku: string;
    price: number;
    currency: string;
    stock: number;
  }): ProductVariant {
    return new ProductVariant(row.id, row.productId, row.sku, row.price, row.currency, row.stock);
  }

  private toLegacyProduct(row: {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): Product {
    return new Product(
      row.id,
      row.name,
      row.description,
      row.slug,
      row.status,
      row.createdAt,
      row.updatedAt
    );
  }
}
