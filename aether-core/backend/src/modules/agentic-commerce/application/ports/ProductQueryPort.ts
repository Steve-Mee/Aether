export interface ProductQueryPort {
  findPrice(tenantId: string, productId: string): Promise<number | null>;
}
