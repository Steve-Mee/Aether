export interface CheckoutIdempotencyRecord {
  tenantId: string;
  key: string;
  orderId: string;
  clientSecret: string | null;
  redirectUrl: string | null;
}

export interface CheckoutIdempotencyPort {
  find(tenantId: string, key: string): Promise<CheckoutIdempotencyRecord | null>;
  save(record: CheckoutIdempotencyRecord): Promise<void>;
}
