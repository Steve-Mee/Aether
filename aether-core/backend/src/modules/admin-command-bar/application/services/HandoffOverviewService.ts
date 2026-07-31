import type { HandoffOverviewPort } from '../ports/HandoffOverviewPort';

export interface HandoffOverviewItem {
  id: string;
  at: string;
  fromAgentKey: string;
  toAgentKey: string;
  mode: 'sync' | 'async';
  status: 'completed' | 'failed' | 'running' | 'pending';
  intent?: string;
  summary?: string;
  correlationId?: string;
  explainSource?: { type: 'command' | 'proactive_suggestion'; id: string };
}

function parseHandoffSummary(summary: string): {
  mode?: string;
  intent?: string;
  success?: boolean;
  correlationId?: string;
  payloadSummary?: string;
} {
  try {
    return JSON.parse(summary) as ReturnType<typeof parseHandoffSummary>;
  } catch {
    return { payloadSummary: summary };
  }
}

export class HandoffOverviewService {
  constructor(private handoffPort: HandoffOverviewPort) {}

  async listRecentHandoffs(
    tenantId: string,
    days = 7,
    limit = 15
  ): Promise<HandoffOverviewItem[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [reflectionRows, peerJobs] = await Promise.all([
      this.handoffPort.findReflectionHandoffs(tenantId, since, limit),
      this.handoffPort.findPeerJobs(tenantId, since, limit),
    ]);

    const items: HandoffOverviewItem[] = [];

    for (const row of reflectionRows) {
      const meta = parseHandoffSummary(row.summary);
      items.push({
        id: `handoff-${row.id}`,
        at: row.createdAt.toISOString(),
        fromAgentKey: row.fromAgentKey,
        toAgentKey: row.toAgentKey,
        mode: meta.mode === 'orchestrated' || meta.mode === 'direct' ? 'sync' : 'sync',
        status: meta.success === false ? 'failed' : 'completed',
        intent: meta.intent,
        summary: meta.payloadSummary ?? row.summary.slice(0, 200),
        correlationId: meta.correlationId,
        explainSource: row.parentRunId
          ? { type: 'command', id: row.parentRunId }
          : undefined,
      });
    }

    for (const job of peerJobs) {
      items.push({
        id: `peer-${job.id}`,
        at: (job.completedAt ?? job.updatedAt).toISOString(),
        fromAgentKey: job.fromAgentKey,
        toAgentKey: job.toAgentKey,
        mode: 'async',
        status:
          job.status === 'completed'
            ? 'completed'
            : job.status === 'failed'
              ? 'failed'
              : job.status === 'running'
                ? 'running'
                : 'pending',
        intent: job.intent ?? undefined,
        summary: job.resultPayload?.slice(0, 200) ?? job.query.slice(0, 200),
        explainSource: job.parentRunId
          ? { type: 'command', id: job.parentRunId }
          : undefined,
      });
    }

    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return items.slice(0, limit);
  }
}
