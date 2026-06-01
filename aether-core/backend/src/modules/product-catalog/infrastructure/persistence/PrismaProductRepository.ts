import { PrismaClient } from '@prisma/client';
import { Product } from '../../domain/entities/Product';
import { ProductRepository } from '../../domain/repositories/ProductRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class PrismaProductRepository implements ProductRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(tenantId: string): Promise<Product[]> {
    const tid = requireTenantId(tenantId, 'PrismaProductRepository.findAll');
    const products = await this.prisma.product.findMany({
      where: { tenantId: tid },
      orderBy: { createdAt: 'desc' },
    });
    return products.map((p) => this.toDomain(p));
  }

  async findById(id: string, tenantId: string): Promise<Product | null> {
    const tid = requireTenantId(tenantId, 'PrismaProductRepository.findById');
    const product = await this.prisma.product.findFirst({ where: { id, tenantId: tid } });
    return product ? this.toDomain(product) : null;
  }

  async findBySlug(slug: string, tenantId: string): Promise<Product | null> {
    const tid = requireTenantId(tenantId, 'PrismaProductRepository.findBySlug');
    const product = await this.prisma.product.findUnique({
      where: { tenantId_slug: { tenantId: tid, slug } },
    });
    return product ? this.toDomain(product) : null;
  }

  async create(
    product: Product,
    tenantId: string,
    extras?: { price?: number; stock?: number }
  ): Promise<Product> {
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
    });
    return this.toDomain(created);
  }

  async update(product: Product, tenantId: string): Promise<Product> {
    const tid = requireTenantId(tenantId, 'PrismaProductRepository.update');
    const updated = await this.prisma.product.update({
      where: { id: product.id },
      data: {
        name: product.name,
        description: product.description,
        slug: product.slug,
        status: product.status,
      },
    });
    if (updated.tenantId !== tid) {
      throw new Error('Cross-tenant product update blocked');
    }
    return this.toDomain(updated);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const tid = requireTenantId(tenantId, 'PrismaProductRepository.delete');
    const existing = await this.prisma.product.findFirst({ where: { id, tenantId: tid } });
    if (!existing) return;
    await this.prisma.product.delete({ where: { id } });
  }

  private toDomain(prismaProduct: {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): Product {
    return new Product(
      prismaProduct.id,
      prismaProduct.name,
      prismaProduct.description,
      prismaProduct.slug,
      prismaProduct.status,
      prismaProduct.createdAt,
      prismaProduct.updatedAt
    );
  }
}
