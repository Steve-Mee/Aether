import { Supplier } from '../entities/Supplier';
import { SupplierProduct } from '../entities/SupplierProduct';

export interface SupplierRepository {
  findAll(tenantId: string): Promise<Supplier[]>;
  findById(id: string, tenantId: string): Promise<Supplier | null>;
  create(data: { name: string; website: string; tenantId: string }): Promise<Supplier>;
  findProductsBySupplier(supplierId: string): Promise<SupplierProduct[]>;
  saveProduct(product: SupplierProduct): Promise<SupplierProduct>;
}
