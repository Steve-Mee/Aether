import { eventBus } from '../../../../../shared/events/eventBus';
import { logger } from '../../../../../shared/logging/logger';
import { updateBrainAgentRunDelegation, getBrainAgentRunById } from '../../../command-brain/BrainAgentRunStore';
import type { AgentOrchestrator } from '../../AgentSupervisorOrchestrator';
import type { AgentPeerPort } from '../AgentPeerPort';
import type { AgentPeerJobPort, AgentPeerJobRecord } from './AgentPeerJobPort';

function parseJobDepth(job: AgentPeerJobRecord): number {
  if (!job.resultPayload) return 1;
  try {
    const parsed = JSON.parse(job.resultPayload) as { meta?: { depth?: number } };
    return parsed.meta?.depth ?? 1;
  } catch {
    return 1;
  }
}

export interface AgentPeerJobWorkerDeps {
  jobPort: AgentPeerJobPort;
  peerBus: AgentPeerPort;
  orchestrator: AgentOrchestrator;
}

export class AgentPeerJobWorker {
  constructor(private deps: AgentPeerJobWorkerDeps) {}

  async processJob(jobId: string, tenantId: string): Promise<void> {
    const job = await this.deps.jobPort.getById(jobId, tenantId);
    if (!job || job.status === 'completed' || job.status === 'failed') return;

    try {
      const result = await this.deps.peerBus.requestPeerHandoff({
        tenantId: job.tenantId,
        sourceAgentKey: job.sourceAgentKey,
        targetAgentKey: job.targetAgentKey,
        intent: job.intent,
        query: job.query,
        parentRunId: job.parentRunId ?? undefined,
        actorId: job.actorId ?? undefined,
        depth: parseJobDepth(job),
      });

      if (!result.success) {
        await this.deps.jobPort.fail(job.id, job.tenantId, result.error ?? 'Peer job failed');
        await eventBus.publish({
          tenantId: job.tenantId,
          type: 'agent.peer.completed',
          payload: { jobId: job.id, success: false, error: result.error },
          idempotencyKey: `agent.peer.completed:${job.id}`,
        });
        if (job.parentRunId) {
          await this.appendPeerResultToParent(job.tenantId, job.parentRunId, {
            jobId: job.id,
            success: false,
            error: result.error,
          });
        }
        return;
      }

      await this.deps.jobPort.complete(job.id, job.tenantId, {
        narrative: result.narrative,
        agentRunId: result.agentRunId,
      });

      await eventBus.publish({
        tenantId: job.tenantId,
        type: 'agent.peer.completed',
        payload: {
          jobId: job.id,
          success: true,
          narrative: result.narrative,
          agentRunId: result.agentRunId,
          parentRunId: job.parentRunId,
        },
        idempotencyKey: `agent.peer.completed:${job.id}`,
      });

      await eventBus.publish({
        tenantId: job.tenantId,
        type: 'agent.handoff.completed',
        payload: {
          jobId: job.id,
          sourceAgentKey: job.sourceAgentKey,
          targetAgentKey: job.targetAgentKey,
          success: true,
          narrative: (result.narrative ?? '').slice(0, 500),
        },
        idempotencyKey: `agent.handoff.completed:${job.id}`,
      });

      if (job.parentRunId) {
        await this.appendPeerResultToParent(job.tenantId, job.parentRunId, {
          jobId: job.id,
          success: true,
          narrative: result.narrative,
          targetAgentKey: job.targetAgentKey,
        });
        await this.deps.orchestrator.resumeFromChild({
          tenantId: job.tenantId,
          parentRunId: job.parentRunId,
          childRunId: result.agentRunId ?? job.id,
          handoffPackage: {
            sourceAgentKey: job.targetAgentKey,
            targetAgentKey: job.sourceAgentKey,
            reflectionIds: [],
            summary: (result.narrative ?? '').slice(0, 500),
          },
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Peer job worker failed';
      logger.error('agent_peer_job_failed', { jobId, tenantId, error: message });
      await this.deps.jobPort.fail(jobId, tenantId, message);
      await eventBus.publish({
        tenantId,
        type: 'agent.peer.completed',
        payload: { jobId, success: false, error: message },
        idempotencyKey: `agent.peer.completed:${jobId}`,
      });
    }
  }

  async handleRequestedEvent(payload: Record<string, unknown>, tenantId: string): Promise<void> {
    const jobId = String(payload.jobId ?? '');
    if (!jobId) return;
    await this.processJob(jobId, tenantId);
  }

  private async appendPeerResultToParent(
    tenantId: string,
    parentRunId: string,
    result: Record<string, unknown>
  ): Promise<void> {
    const parent = await getBrainAgentRunById(parentRunId, tenantId);
    const existingMeta =
      typeof parent?.delegationMeta === 'object' && parent.delegationMeta
        ? (parent.delegationMeta as Record<string, unknown>)
        : {};
    const prior = Array.isArray(existingMeta.asyncPeerResults)
      ? (existingMeta.asyncPeerResults as Record<string, unknown>[])
      : [];

    await updateBrainAgentRunDelegation({
      id: parentRunId,
      tenantId,
      delegationMeta: {
        ...existingMeta,
        asyncPeerResults: [...prior, result],
      } as import('@prisma/client').Prisma.InputJsonValue,
    });
  }
}

let workerInstance: AgentPeerJobWorker | null = null;

export function setAgentPeerJobWorker(worker: AgentPeerJobWorker): void {
  workerInstance = worker;
}

export function getAgentPeerJobWorker(): AgentPeerJobWorker | null {
  return workerInstance;
}

export function registerAgentPeerJobEventHandler(): void {
  eventBus.subscribe('agent.peer.requested', async (event) => {
    const worker = getAgentPeerJobWorker();
    if (!worker) return;
    await worker.handleRequestedEvent(event.payload, event.tenantId);
  });
}
