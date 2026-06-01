export interface EmailContextData {
  customerEmail: string;
  customerName: string | null;
  recentOrderCount: number;
  recentOrderTotal: number;
  priorEmailCount: number;
  source: 'database' | 'fallback';
}

export interface EmailContextPort {
  loadContext(fromEmail: string, tenantId: string): Promise<EmailContextData>;
}
