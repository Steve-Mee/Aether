import { prisma } from '../../../../shared/prisma/client';
import { notifyOverviewHandoff } from '../../../../modules/admin-command-bar/application/services/OverviewFeedNotify';

export type PeerHandoffMode = 'direct' | 'orchestrated';

export interface PeerHandoffAuditEntry {
  tenantId: string;
  sourceAgentKey: string;
  targetAgentKey: string;
  intent: string;
  mode: PeerHandoffMode;
  success: boolean;
  latencyMs: number;
  parentRunId?: string;
  agentRunId?: string;
  error?: string;
  correlationId?: string;
  payloadSummary?: string;
}

export class PeerHandoffAuditLog {
  async record(entry: PeerHandoffAuditEntry): Promise<void> {
    try {
      const row = await prisma.reflectionHandoffLog.create({
        data: {
          tenantId: entry.tenantId,
          sourceAgentKey: entry.sourceAgentKey,
          targetAgentKey: entry.targetAgentKey,
          reflectionIds: [],
          summary: JSON.stringify({
            mode: entry.mode,
            intent: entry.intent,
            success: entry.success,
            latencyMs: entry.latencyMs,
            error: entry.error,
            agentRunId: entry.agentRunId,
            correlationId: entry.correlationId,
            payloadSummary: entry.payloadSummary,
          }),
          parentRunId: entry.parentRunId ?? null,
          childRunId: entry.agentRunId ?? null,
        },
      });
      notifyOverviewHandoff(entry.tenantId, {
        id: row.id,
        at: row.createdAt.toISOString(),
        fromAgentKey: entry.sourceAgentKey,
        toAgentKey: entry.targetAgentKey,
        mode: 'sync',
        status: entry.success ? 'completed' : 'failed',
        intent: entry.intent,
        summary: entry.payloadSummary,
        correlationId: entry.correlationId,
        parentRunId: entry.parentRunId,
      });
    } catch {
      // Audit is best-effort
    }
  }
}
