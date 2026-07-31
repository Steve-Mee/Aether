import type {
  ExplainabilityPayload,
  ExplainabilityResponse,
  ExplainabilitySourceType,
} from '../../ai/intelligence/explainability/types';
import { explainabilityPersister } from '../../ai/intelligence/explainability/ExplainabilityPersister';
import { getMerchantSettings } from '../settings/TenantSettingsService';
import { requireTenantId } from '../tenant/tenantContext';
import { prisma } from '../prisma/client';
import { ACTION_LABELS } from '../audit/activityLabels';
import {
  attachSimilarActions,
  payloadToSections,
  resolveUiDetailLevel,
  snapshotFlowGraph,
} from './explainabilityPresentation';

export {
  persistCommandExplainability,
  persistProactiveExplainability,
  persistProactiveAutoExplainability,
} from './explainabilityPersist';

export async function buildExplainabilityTimeline(params: {
  tenantId: string;
  entityType: 'email' | 'approval' | 'command' | 'proactive_suggestion';
  entityId: string;
}): Promise<ExplainabilityResponse> {
  const tenantId = requireTenantId(params.tenantId, 'explainability');
  const settings = await getMerchantSettings(tenantId);

  if (params.entityType === 'command' || params.entityType === 'proactive_suggestion') {
    const sourceType: ExplainabilitySourceType =
      params.entityType === 'command' ? 'command' : 'proactive_suggestion';
    let snapshot = await explainabilityPersister.getSnapshot(
      tenantId,
      sourceType,
      params.entityId
    );

    if (!snapshot && params.entityType === 'proactive_suggestion') {
      snapshot = await explainabilityPersister.getSnapshot(
        tenantId,
        'proactive_auto',
        params.entityId
      );
    }

    if (snapshot) {
      const payload = snapshot.payload as unknown as ExplainabilityPayload;
      const uiLevel = resolveUiDetailLevel(
        settings.explainabilityPrefs.detailLevel,
        snapshot.detailLevel
      );
      const flowGraph = snapshotFlowGraph(snapshot);
      const extras = await attachSimilarActions(
        tenantId,
        snapshot,
        settings.explainabilityPrefs
      );
      return {
        entityType: params.entityType,
        entityId: params.entityId,
        detailLevel: uiLevel,
        summary: snapshot.summary,
        summarySource: snapshot.summarySource as 'template' | 'llm',
        sections: payloadToSections(payload, uiLevel, flowGraph),
        flowGraph: uiLevel === 'extended' ? flowGraph : undefined,
        ...extras,
      };
    }

    if (params.entityType === 'command') {
      const runs = await prisma.brainAgentRun.findMany({
        where: { tenantId, commandId: params.entityId },
        orderBy: { createdAt: 'asc' },
        take: 5,
      });
      if (runs.length > 0) {
        const agentKeys = runs.map((r) => r.agentKey);
        const summary = `Command uitgevoerd met ${agentKeys.length} agent-run(s).`;
        return {
          entityType: params.entityType,
          entityId: params.entityId,
          detailLevel: 'simple',
          summary,
          sections: [
            {
              id: 'agents',
              title: 'Betrokken agents',
              items: agentKeys.map((k) => ({ label: k })),
            },
          ],
        };
      }
    }

    throw new Error('Explainability snapshot not found');
  }

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

    const events = [
      {
        at: email.createdAt.toISOString(),
        label: 'E-mail ontvangen',
        status: email.status,
        category: email.category,
      },
      ...audits.map((a) => ({
        at: a.createdAt.toISOString(),
        label: ACTION_LABELS[a.action] ?? a.action,
        module: a.module,
        actor: a.actor,
        details: typeof a.details === 'string' ? JSON.parse(a.details) : a.details,
      })),
    ];

    return {
      entityType: 'email',
      entityId: params.entityId,
      detailLevel: 'simple',
      summary: 'Tijdlijn van e-mailverwerking',
      sections: [],
      events,
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

  const events = [
    {
      at: approval.createdAt.toISOString(),
      label: 'Goedkeuring aangemaakt',
      module: approval.module,
      actionType: approval.actionType,
      status: approval.status,
    },
    ...audits.map((a) => ({
      at: a.createdAt.toISOString(),
      label: ACTION_LABELS[a.action] ?? a.action,
      module: a.module,
      actor: a.actor,
    })),
  ];

  return {
    entityType: 'approval',
    entityId: params.entityId,
    detailLevel: 'simple',
    summary: 'Tijdlijn van goedkeuringsproces',
    sections: [],
    events,
  };
}
