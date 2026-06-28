import { prisma } from '../prisma/client';
import { ACTION_LABELS } from '../audit/activityLabels';
import { requireTenantId } from '../tenant/tenantContext';

export async function buildAutonomyTrace(params: {
  tenantId: string;
  module?: string;
  limit?: number;
}): Promise<{ events: Array<Record<string, unknown>> }> {
  const tenantId = requireTenantId(params.tenantId, 'autonomy.trace');
  const limit = params.limit ?? 50;
  const moduleFilter = params.module;

  const audits = await prisma.auditLog.findMany({
    where: {
      tenantId,
      ...(moduleFilter ? { module: moduleFilter } : {}),
      action: { startsWith: 'autonomy_' },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const runs = await prisma.workflowRun.findMany({
    where: { tenantId, ...(moduleFilter ? { workflow: { contains: moduleFilter } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { steps: true },
  });

  return {
    events: [
      ...audits.map((a) => ({
        kind: 'autonomy_stage',
        at: a.createdAt,
        stage: a.action.replace('autonomy_', ''),
        module: a.module,
        label: ACTION_LABELS[a.action] ?? a.action,
      })),
      ...runs.map((r) => ({
        kind: 'workflow_run',
        at: r.createdAt,
        workflow: r.workflow,
        status: r.status,
        stepCount: r.steps.length,
      })),
    ].sort((a, b) => new Date(String(b.at)).getTime() - new Date(String(a.at)).getTime()),
  };
}

export {
  buildExplainabilityTimeline,
  persistCommandExplainability,
  persistProactiveExplainability,
  persistProactiveAutoExplainability,
} from './explainabilityTimeline';

export { explainabilityDiffService } from '../../ai/intelligence/explainability/ExplainabilityDiffService';
