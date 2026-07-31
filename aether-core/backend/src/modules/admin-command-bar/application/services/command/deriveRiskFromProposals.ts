import type { ToolProposal } from '../../../../../ai/intelligence/personal-brain/tools/types';

export function deriveRiskFromProposals(proposals: ToolProposal[]): {
  riskBand?: 'low' | 'medium' | 'high';
  requiresApproval?: boolean;
} {
  if (proposals.length === 0) return {};
  const risks = proposals.map((p) => p.risk);
  const riskBand = risks.includes('high') ? 'high' : risks.includes('medium') ? 'medium' : 'low';
  return {
    riskBand,
    requiresApproval: proposals.some((p) => p.requiresApproval || p.risk === 'high'),
  };
}
