export interface PrivacyBudgetRow {
  spent: number;
  budgetLimit: number;
}

export interface PrivacyBudgetPort {
  getOrCreate(tenantId: string): Promise<PrivacyBudgetRow>;
  spend(tenantId: string, cost: number): Promise<void>;
}

export interface InsightRow {
  type: string;
}

export interface InsightQueryPort {
  listRecent(tenantId: string, limit: number): Promise<InsightRow[]>;
}
