export interface StorefrontCustomerRecord {
  id: string;
  email: string;
}

export interface StorefrontCustomerPort {
  upsertByEmail(
    tenantId: string,
    input: { email: string; firstName?: string | null; lastName?: string | null }
  ): Promise<StorefrontCustomerRecord>;
}
