import { prisma } from '../prisma/client';
import { requireTenantId } from '../tenant/tenantContext';

const ACTION_LABELS: Record<string, string> = {
  email_processed: 'E-mail verwerkt',
  action_executed: 'Goedgekeurde actie uitgevoerd',
  autonomy_observe: 'Observatie (inkomend bericht)',
  autonomy_decide: 'Beslissing (autonomie-kern)',
  autonomy_approve: 'Goedkeuring vereist',
  autonomy_execute: 'Autonoom uitgevoerd',
  autonomy_measure: 'Meting vastgelegd',
  mail_approval_required_received: 'Goedkeuring aangevraagd',
  approved: 'Goedgekeurd',
  rejected: 'Afgewezen',
};

export async function buildExplainabilityTimeline(params: {
  tenantId: string;
  entityType: 'email' | 'approval';
  entityId: string;
}): Promise<{ entityType: string; entityId: string; events: Array<Record<string, unknown>> }> {
  const tenantId = requireTenantId(params.tenantId, 'explainability');

  if (params.entityType === 'email') {
    const email = await prisma.emailMessage.findFirst({
      where: { id: params.entityId, tenantId },
    });
    if (!email) throw new Error('Email not found');

    const audits = await prisma.auditLog.findMany({
      where: {
        tenantId,
        details: { contains: params.entityId },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return {
      entityType: 'email',
      entityId: params.entityId,
      events: [
        {
          at: email.createdAt,
          label: 'E-mail ontvangen',
          status: email.status,
          category: email.category,
        },
        ...audits.map((a) => ({
          at: a.createdAt,
          label: ACTION_LABELS[a.action] ?? a.action,
          module: a.module,
          actor: a.actor,
          details: typeof a.details === 'string' ? JSON.parse(a.details) : a.details,
        })),
      ],
    };
  }

  const approval = await prisma.approval.findFirst({
    where: { id: params.entityId, tenantId },
  });
  if (!approval) throw new Error('Approval not found');

  const audits = await prisma.auditLog.findMany({
    where: {
      tenantId,
      details: { contains: params.entityId },
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  return {
    entityType: 'approval',
    entityId: params.entityId,
    events: [
      {
        at: approval.createdAt,
        label: 'Goedkeuring aangemaakt',
        module: approval.module,
        actionType: approval.actionType,
        status: approval.status,
      },
      ...audits.map((a) => ({
        at: a.createdAt,
        label: ACTION_LABELS[a.action] ?? a.action,
        module: a.module,
        actor: a.actor,
      })),
    ],
  };
}

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
