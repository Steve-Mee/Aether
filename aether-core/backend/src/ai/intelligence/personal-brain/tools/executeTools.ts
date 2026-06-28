import { isLowRiskExecutableAsync } from './ActionRiskPolicyBridge';
import { isStaticLowRiskExecutable } from './ActionRiskClassifier';
import type {
  BrainToolContext,
  BrainToolExecutor,
  ToolExecutionResult,
} from './types';

export type ExecuteConfirmedDelegate = (
  toolName: string,
  ctx: BrainToolContext,
  payload: Record<string, unknown>
) => Promise<ToolExecutionResult>;

export type BuildProposalDelegate = (
  toolName: string,
  ctx: BrainToolContext,
  input: Record<string, unknown>
) => Promise<{ payload: Record<string, unknown>; requiresApproval: boolean }>;

export function executeLowRiskActionTool(
  getExecutor: (name: string) => BrainToolExecutor | undefined,
  executeConfirmed: ExecuteConfirmedDelegate,
  buildProposal?: BuildProposalDelegate
): BrainToolExecutor {
  return {
    definition: {
      name: 'executeLowRiskAction',
      description:
        'Execute a whitelisted low-risk action immediately without approval (createInsight; updatePrice when within tenant policy)',
      parameters: {
        action: { type: 'string', required: true, description: 'Target tool name e.g. createInsight or updatePrice' },
        input: { type: 'object', required: true, description: 'Tool input payload' },
      },
      risk: 'low',
      kind: 'read',
      module: 'admin-command-bar',
    },
    validate(input) {
      const action = String(input.action ?? '').trim();
      if (!action) return { ok: false, error: 'action is required' };
      const inner = input.input;
      if (typeof inner !== 'object' || inner === null || Array.isArray(inner)) {
        return { ok: false, error: 'input must be an object' };
      }
      const executor = getExecutor(action);
      if (!executor?.executeConfirmed) {
        return { ok: false, error: `Tool ${action} cannot execute directly` };
      }
      if (!isStaticLowRiskExecutable(action) && action !== 'updatePrice') {
        return { ok: false, error: `${action} is not allowed for direct low-risk execution` };
      }
      return executor.validate(inner as Record<string, unknown>);
    },
    async executeRead(ctx, input) {
      const action = String(input.action);
      const innerInput = (input.input as Record<string, unknown>) ?? {};

      const allowed = await isLowRiskExecutableAsync(ctx.tenantId, action, innerInput);
      if (!allowed) {
        return {
          success: false,
          error: `${action} is not eligible for direct low-risk execution under tenant policy`,
        };
      }

      let payload = innerInput;
      if (action === 'updatePrice' && buildProposal) {
        const draft = await buildProposal(action, ctx, innerInput);
        if (draft.requiresApproval) {
          return {
            success: false,
            error: 'Price change requires approval inbox — use updatePrice propose tool instead',
          };
        }
        payload = draft.payload;
      }

      const result = await executeConfirmed(action, ctx, payload);
      if (!result.success) {
        return { success: false, error: result.error ?? 'Execution failed' };
      }
      return {
        success: true,
        action,
        result: result.result,
        risk: 'low',
        message: result.result,
      };
    },
  };
}
