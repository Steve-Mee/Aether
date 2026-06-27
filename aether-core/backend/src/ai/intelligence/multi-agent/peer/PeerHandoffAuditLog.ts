import { prisma } from '../../../../shared/prisma/client';

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
}

export class PeerHandoffAuditLog {
  async record(entry: PeerHandoffAuditEntry): Promise<void> {
    try {
      await prisma.reflectionHandoffLog.create({
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
          }),
          parentRunId: entry.parentRunId ?? null,
          childRunId: entry.agentRunId ?? null,
        },
      });
    } catch {
      // Audit is best-effort
    }
  }
}
