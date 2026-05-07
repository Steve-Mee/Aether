export interface ImprovementProposal {
  id: string;
  module: string;
  type: 'PERFORMANCE' | 'REFACTORING' | 'SECURITY' | 'FEATURE';
  description: string;
  confidence: number;        // 0-1
  estimatedImpact: string;
  status: 'PROPOSED' | 'APPROVED' | 'APPLIED' | 'REJECTED';
  createdAt: Date;
}