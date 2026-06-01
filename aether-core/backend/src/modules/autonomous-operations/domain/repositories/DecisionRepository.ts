export interface DecisionRecord {
  id: string;
  tenantId: string;
  type: string;
  result: string;
  rationale?: string | null;
  actor?: string | null;
  createdAt: Date;
}

export interface DecisionRepository {
  findAll(tenantId: string): Promise<DecisionRecord[]>;
  findById(id: string, tenantId: string): Promise<DecisionRecord | null>;
  create(data: {
    tenantId: string;
    type: string;
    result: string;
    rationale?: string;
    actor?: string;
  }): Promise<DecisionRecord>;
}
