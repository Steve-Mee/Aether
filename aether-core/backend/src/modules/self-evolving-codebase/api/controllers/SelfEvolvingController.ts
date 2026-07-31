import { Request, Response } from 'express';
import { AnalyzeCodebaseUseCase } from '../../application/use-cases/AnalyzeCodebaseUseCase';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { requireOperator } from '../../../../shared/security/rbac';
import { createApproval } from '../../../../shared/approval/approvalService';
import { CodeAnalyzerService } from '../../application/services/CodeAnalyzerService';
import { autonomyStateMachine, mapProposalStatusToStage } from '../../../../shared/autonomy/AutonomyStateMachine';
import { writeAuditLog } from '../../../../shared/audit/auditService';

const LIVE_ALLOWED_STAGES = new Set(['staged_rollout', 'human_gate']);

export class SelfEvolvingController {
  private analyzeUseCase = new AnalyzeCodebaseUseCase();
  private analyzer = new CodeAnalyzerService();

  analyzeCodebase = [
    requireOperator,
    async (req: Request, res: Response) => {
      try {
        const { selfEvolving } = getCompositionRoot();
        const proposals = await this.analyzeUseCase.execute();
        for (const p of proposals) {
          const checks = await this.analyzer.runStaticChecks();
          const sandbox = await this.analyzer.runSandboxValidation(p.id);
          let status = 'proposed';
          if (checks.typecheck) {
            status = 'static_checks';
          }
          if (sandbox.passed) {
            status = autonomyStateMachine.nextStage(mapProposalStatusToStage(status), 'sandbox_passed');
          }
          await selfEvolving.createProposal(req.tenantId!, {
            module: p.module,
            type: p.type,
            description: p.description,
            confidence: p.confidence,
            status,
          });
        }
        res.json({
          status: 'experimental',
          message: 'Codebase analysis complete — proposals require human approval',
          proposals,
          count: proposals.length,
        });
      } catch {
        res.status(500).json({ error: 'Failed to analyze codebase' });
      }
    },
  ];

  getAllProposals = [
    requireOperator,
    async (req: Request, res: Response) => {
      const { selfEvolving } = getCompositionRoot();
      const proposals = await selfEvolving.listProposals(req.tenantId!);
      res.json({ status: 'experimental', proposals });
    },
  ];

  approveAndApply = [
    requireOperator,
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const { selfEvolving } = getCompositionRoot();
      const proposal = await selfEvolving.findProposal(req.tenantId!, id);
      if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

      await selfEvolving.updateProposalStatus(id, 'pending_approval');

      await createApproval({
        tenantId: req.tenantId!,
        module: 'self-evolving-codebase',
        actionType: 'apply_proposal',
        payload: { proposalId: id, description: proposal.description },
        requestedBy: req.actorId,
      });

      res.json({
        status: 'experimental',
        message: `Proposal ${id} queued for human approval — auto-apply disabled by policy`,
      });
    },
  ];

  promoteProposal = [
    requireOperator,
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const { target } = req.body as { target?: 'staged_rollout' | 'live' };
      const { selfEvolving } = getCompositionRoot();
      const proposal = await selfEvolving.findProposal(req.tenantId!, id);
      if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

      const currentStage = mapProposalStatusToStage(proposal.status);
      const desired = target ?? 'staged_rollout';

      if (desired === 'live') {
        if (!LIVE_ALLOWED_STAGES.has(currentStage)) {
          return res.status(400).json({
            error: 'Cannot promote to live without staged_rollout and approval',
            currentStage,
          });
        }
        const sandbox = await this.analyzer.runSandboxValidation(id);
        if (!sandbox.passed) {
          return res.status(400).json({ error: 'Sandbox validation must pass before live promotion' });
        }
        const pendingApproval = await selfEvolving.countPendingApprovals(req.tenantId!);
        if (pendingApproval > 0) {
          return res.status(400).json({ error: 'Pending human approval blocks live promotion' });
        }
        const appliedConfig = {
          module: proposal.module,
          type: proposal.type,
          description: proposal.description,
          previousStatus: proposal.status,
          appliedAt: new Date().toISOString(),
          sandboxPassed: true,
        };
        await selfEvolving.updateProposalStatus(id, 'applied', appliedConfig);
        await writeAuditLog({
          tenantId: req.tenantId!,
          module: 'self-evolving-codebase',
          action: 'proposal_applied',
          actor: req.actorId,
          details: {
            proposalId: id,
            previousStatus: proposal.status,
            module: proposal.module,
            success: true,
          },
        });
        return res.json({ status: 'partial', stage: 'live', proposalId: id });
      }

      const next = autonomyStateMachine.nextStage(currentStage, 'rollout_complete');
      const statusMap: Record<string, string> = {
        staged_rollout: 'staged',
        human_gate: 'pending_approval',
      };
      await selfEvolving.updateProposalStatus(id, statusMap[next] ?? proposal.status);
      res.json({ status: 'experimental', stage: next, proposalId: id });
    },
  ];

  getStatus = [
    requireOperator,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const { selfEvolving } = getCompositionRoot();
      const [total, applied, staged] = await Promise.all([
        selfEvolving.countProposals(tenantId),
        selfEvolving.countProposals(tenantId, 'applied'),
        selfEvolving.countProposals(tenantId, 'staged'),
      ]);
      res.json({
        status: 'experimental',
        lastAnalysis: new Date().toISOString(),
        totalProposalsGenerated: total,
        appliedImprovements: applied,
        stagedRollouts: staged,
        humanApprovalRate: total > 0 ? `${Math.round((applied / total) * 100)}%` : 'N/A',
      });
    },
  ];

  rollbackProposal = [
    requireOperator,
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const { selfEvolving } = getCompositionRoot();
      const proposal = await selfEvolving.findProposal(req.tenantId!, id);
      if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
      if (proposal.status !== 'applied' && proposal.status !== 'staged') {
        return res.status(400).json({ error: 'Only applied or staged proposals can be rolled back' });
      }

      const previousStatus = proposal.status;
      const snapshot = proposal.appliedConfig;
      await selfEvolving.updateProposalStatus(id, 'rolled_back', null);

      await writeAuditLog({
        tenantId: req.tenantId!,
        module: 'self-evolving-codebase',
        action: 'proposal_rollback',
        actor: req.actorId,
        details: {
          proposalId: id,
          previousStatus,
          module: proposal.module,
          restoredSnapshot: snapshot,
          success: true,
        },
      });

      res.json({ status: 'partial', proposalId: id, previousStatus, rolledBack: true });
    },
  ];
}
