import { Supplier, SupplierStatus } from '../entities/Supplier';
import { SupplierProduct } from '../entities/SupplierProduct';

export interface SupplierUpdateInput {
  status?: SupplierStatus;
  autoSyncEnabled?: boolean;
  supplierType?: string | null;
}

export interface SupplierRepository {
  findAll(tenantId: string): Promise<Supplier[]>;
  findById(id: string, tenantId: string): Promise<Supplier | null>;
  create(data: {
    name: string;
    website: string;
    tenantId: string;
    supplierType?: string | null;
  }): Promise<Supplier>;
  update(id: string, tenantId: string, data: SupplierUpdateInput): Promise<Supplier | null>;
  findProductsBySupplier(supplierId: string): Promise<SupplierProduct[]>;
  saveProduct(product: SupplierProduct): Promise<SupplierProduct>;
}
