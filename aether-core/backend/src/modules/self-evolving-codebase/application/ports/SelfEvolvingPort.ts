/** JSON-serializable applied config; null clears appliedConfig. */
export type ProposalConfigJson = Record<string, unknown> | null;

export interface SelfEvolvingProposal {
  id: string;
  status: string;
  module: string;
  type: string;
  description: string;
  appliedConfig?: unknown;
}

export interface SelfEvolvingPort {
  createProposal(
    tenantId: string,
    data: {
      module: string;
      type: string;
      description: string;
      confidence: number;
      status: string;
    }
  ): Promise<unknown>;
  listProposals(tenantId: string): Promise<unknown[]>;
  findProposal(tenantId: string, id: string): Promise<SelfEvolvingProposal | null>;
  updateProposalStatus(
    id: string,
    status: string,
    appliedConfig?: ProposalConfigJson
  ): Promise<unknown>;
  countProposals(tenantId: string, status?: string): Promise<number>;
  countPendingApprovals(tenantId: string): Promise<number>;
}
