import { Supplier } from '../entities/Supplier';
import { SupplierProduct } from '../entities/SupplierProduct';

export interface SupplierRepository {
  findAll(): Promise<Supplier[]>;
  findById(id: string): Promise<Supplier | null>;
  create(supplier: Supplier): Promise<Supplier>;
  findProductsBySupplier(supplierId: string): Promise<SupplierProduct[]>;
  saveProduct(product: SupplierProduct): Promise<SupplierProduct>;
}