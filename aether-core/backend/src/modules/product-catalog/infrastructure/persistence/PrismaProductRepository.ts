import { PrismaClient } from '@prisma/client';
import { Product } from '../../domain/entities/Product';
import { ProductRepository } from '../../domain/repositories/ProductRepository';

export class PrismaProductRepository implements ProductRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<Product[]> {
    const products = await this.prisma.product.findMany();
    return products.map(p => this.toDomain(p));
  }

  async findById(id: string): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    return product ? this.toDomain(product) : null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({ where: { slug } });
    return product ? this.toDomain(product) : null;
  }

  async create(product: Product): Promise<Product> {
    const created = await this.prisma.product.create({
      data: {
        name: product.name,
        description: product.description,
        slug: product.slug,
        status: product.status,
      },
    });
    return this.toDomain(created);
  }

  async update(product: Product): Promise<Product> {
    const updated = await this.prisma.product.update({
      where: { id: product.id },
      data: {
        name: product.name,
        description: product.description,
        slug: product.slug,
        status: product.status,
      },
    });
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.delete({ where: { id } });
  }

  private toDomain(prismaProduct: any): Product {
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