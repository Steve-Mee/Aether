import { PrismaClient } from '@prisma/client';
import { Supplier, SupplierStatus } from '../../domain/entities/Supplier';
import { SupplierProduct } from '../../domain/entities/SupplierProduct';
import {
  SupplierRepository,
  SupplierUpdateInput,
} from '../../domain/repositories/SupplierRepository';

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

  async create(data: {
    name: string;
    website: string;
    tenantId: string;
    supplierType?: string | null;
  }): Promise<Supplier> {
    const created = await this.prisma.supplier.create({
      data: {
        name: data.name,
        website: data.website,
        tenantId: data.tenantId,
        supplierType: data.supplierType ?? null,
        status: 'active',
        autoSyncEnabled: true,
      },
    });
    return this.toDomain(created);
  }

  async update(
    id: string,
    tenantId: string,
    data: SupplierUpdateInput
  ): Promise<Supplier | null> {
    const existing = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!existing) return null;

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.autoSyncEnabled !== undefined
          ? { autoSyncEnabled: data.autoSyncEnabled }
          : {}),
        ...(data.supplierType !== undefined ? { supplierType: data.supplierType } : {}),
      },
    });
    return this.toDomain(updated);
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
    status: string;
    autoSyncEnabled: boolean;
    supplierType: string | null;
    createdAt: Date;
  }): Supplier {
    return new Supplier(
      prismaSupplier.id,
      prismaSupplier.name,
      prismaSupplier.website,
      prismaSupplier.status as SupplierStatus,
      prismaSupplier.autoSyncEnabled,
      prismaSupplier.supplierType,
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
