import { PrismaClient } from '@prisma/client';
import { Supplier } from '../../domain/entities/Supplier';
import { SupplierProduct } from '../../domain/entities/SupplierProduct';
import { SupplierRepository } from '../../domain/repositories/SupplierRepository';

export class PrismaSupplierRepository implements SupplierRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(tenantId: string): Promise<Supplier[]> {
    const suppliers = await this.prisma.supplier.findMany({ where: { tenantId } });
    return suppliers.map((s) => this.toDomain(s));
  }

  async findById(id: string, tenantId: string): Promise<Supplier | null> {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    return supplier ? this.toDomain(supplier) : null;
  }

  async create(data: { name: string; website: string; tenantId: string }): Promise<Supplier> {
    const created = await this.prisma.supplier.create({
      data: {
        name: data.name,
        website: data.website,
        tenantId: data.tenantId,
      },
    });
    return this.toDomain(created);
  }

  async findProductsBySupplier(supplierId: string): Promise<SupplierProduct[]> {
    const products = await this.prisma.supplierProduct.findMany({
      where: { supplierId },
    });
    return products.map((p) => this.toProductDomain(p));
  }

  async saveProduct(product: SupplierProduct): Promise<SupplierProduct> {
    const saved = await this.prisma.supplierProduct.upsert({
      where: {
        supplierId_sku: { supplierId: product.supplierId, sku: product.sku },
      },
      update: {
        currentPrice: product.currentPrice,
        stock: product.stockLevel,
        lastUpdated: new Date(),
      },
      create: {
        supplierId: product.supplierId,
        name: product.name,
        sku: product.sku,
        currentPrice: product.currentPrice,
        stock: product.stockLevel,
        lastUpdated: new Date(),
      },
    });
    return this.toProductDomain(saved);
  }

  private toDomain(prismaSupplier: {
    id: string;
    name: string;
    website: string;
    createdAt: Date;
  }): Supplier {
    return new Supplier(
      prismaSupplier.id,
      prismaSupplier.name,
      prismaSupplier.website,
      'active',
      prismaSupplier.createdAt
    );
  }

  private toProductDomain(prismaProduct: {
    id: string;
    supplierId: string;
    name: string;
    sku: string;
    currentPrice: number;
    stock: number;
    lastUpdated: Date;
  }): SupplierProduct {
    return new SupplierProduct(
      prismaProduct.id,
      prismaProduct.supplierId,
      prismaProduct.name,
      prismaProduct.sku,
      prismaProduct.currentPrice,
      'EUR',
      prismaProduct.stock,
      prismaProduct.lastUpdated
    );
  }
}
