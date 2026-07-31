export interface SuggestionDataPort {
  countProducts(tenantId: string): Promise<number>;
  countUnreadEmails(tenantId: string): Promise<number>;
}
