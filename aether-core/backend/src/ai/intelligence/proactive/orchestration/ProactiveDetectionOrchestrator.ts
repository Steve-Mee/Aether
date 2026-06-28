import type { AgentSupervisorPort } from '../../multi-agent/AgentSupervisorPort';
import { ExplainabilityCollector } from '../../explainability/ExplainabilityCollector';
import type { ProactiveSuggestionRecord } from '../ProactiveSuggestionRepository';
import type { ProactiveSuggestionRepository } from '../ProactiveSuggestionRepository';
import { proactiveSuggestionEmitter } from '../ProactiveSuggestionEmitter';
import {
  isProactiveDetectionOrchestrationEnabled,
  resolveProactiveDetectionOrchMaxPerHour,
} from '../proactiveConfig';
import { logger } from '../../../../shared/logging/logger';
import { persistProactiveExplainability } from '../../../../shared/explain/ExplainabilityService';

const INVENTORY = 'inventory.low_stock';
const MARGIN = 'pricing.margin_decline';

function evidenceToSnippets(evidence: Record<string, unknown>): string[] {
  const snippets: string[] = [];
  if (typeof evidence.lowStockCount === 'number') {
    snippets.push(`Low stock count: ${evidence.lowStockCount}`);
  }
  if (typeof evidence.lowMarginCount === 'number') {
    snippets.push(`Low margin SKU count: ${evidence.lowMarginCount}`);
  }
  if (typeof evidence.supplierId === 'string') {
    snippets.push(`Supplier signal detected`);
  }
  return snippets.slice(0, 5);
}

export class ProactiveDetectionOrchestrator {
  private hourlyCount = new Map<string, { hour: string; count: number }>();

  constructor(
    private repository: ProactiveSuggestionRepository,
    private agentSupervisor?: AgentSupervisorPort
  ) {}

  private canOrchestrate(tenantId: string): boolean {
    if (!isProactiveDetectionOrchestrationEnabled()) return false;
    const hour = new Date().toISOString().slice(0, 13);
    const entry = this.hourlyCount.get(tenantId);
    const max = resolveProactiveDetectionOrchMaxPerHour();
    if (!entry || entry.hour !== hour) {
      this.hourlyCount.set(tenantId, { hour, count: 0 });
      return true;
    }
    return entry.count < max;
  }

  private bumpCount(tenantId: string): void {
    const hour = new Date().toISOString().slice(0, 13);
    const entry = this.hourlyCount.get(tenantId);
    if (!entry || entry.hour !== hour) {
      this.hourlyCount.set(tenantId, { hour, count: 1 });
    } else {
      entry.count += 1;
    }
  }

  async enqueue(record: ProactiveSuggestionRecord): Promise<void> {
    if (record.detectionRunId) return;
    if (!isProactiveDetectionOrchestrationEnabled()) return;
    void this.orchestrate(record).catch((err) => {
      logger.warn('proactive_detection_orch_failed', {
        tenantId: record.tenantId,
        id: record.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  private async orchestrate(record: ProactiveSuggestionRecord): Promise<void> {
    if (!this.canOrchestrate(record.tenantId)) return;
    if (!this.agentSupervisor?.executeSpecialist) return;

    this.bumpCount(record.tenantId);

    const evidence = record.evidence ?? {};
    const mergedTriggers = evidence.mergedTriggers as string[] | undefined;
    const isCluster =
      Array.isArray(mergedTriggers) &&
      mergedTriggers.includes(INVENTORY) &&
      mergedTriggers.includes(MARGIN);

    let narrative = record.summary ?? '';
    let runId = `det-${record.id}`;
    const explainCollector = new ExplainabilityCollector();

    if (isCluster && this.agentSupervisor.executeSequential) {
      const results = await this.agentSupervisor.executeSequential([
        {
          tenantId: record.tenantId,
          agentKey: 'inventory',
          intent: record.intentId,
          command: record.command,
          contextSnippets: evidenceToSnippets(evidence),
          handlerResult: record.title,
          deferToTools: true,
          actorId: 'proactive_detection',
          explainabilityCollector: explainCollector,
          onEvent: explainCollector.wrap(undefined),
        },
        {
          tenantId: record.tenantId,
          agentKey: 'pricing',
          intent: 'PRICING_OPTIMIZE',
          command: 'Review low-stock items with margin pressure and suggest pricing',
          contextSnippets: evidenceToSnippets(evidence),
          handlerResult: record.title,
          deferToTools: true,
          actorId: 'proactive_detection',
          explainabilityCollector: explainCollector,
          onEvent: explainCollector.wrap(undefined),
        },
      ]);
      const last = results[results.length - 1];
      narrative = last?.narrative ?? narrative;
      runId = last?.agentRunId ?? runId;
    } else {
      const result = await this.agentSupervisor.executeSpecialist({
        tenantId: record.tenantId,
        agentKey: (record.agentKey ?? 'inventory') as 'inventory',
        intent: record.intentId,
        command: record.command,
        contextSnippets: evidenceToSnippets(evidence),
        handlerResult: record.title,
        deferToTools: true,
        actorId: 'proactive_detection',
        explainabilityCollector: explainCollector,
        onEvent: explainCollector.wrap(undefined),
      });
      narrative = result.narrative ?? narrative;
      runId = result.agentRunId ?? runId;
    }

    const titleLine = narrative.split('\n').find((l) => l.trim()) ?? record.title;
    const updated = await this.repository.updateOrchestration(record.tenantId, record.id, {
      title: titleLine.slice(0, 200),
      summary: narrative.slice(0, 1000),
      command: record.command,
      detectionRunId: runId,
      orchestrationSource: 'agent',
    });

    void persistProactiveExplainability({
      tenantId: record.tenantId,
      suggestionId: record.id,
      triggerId: record.triggerId,
      agentKey: record.agentKey ?? undefined,
      title: titleLine.slice(0, 200),
      evidence: evidence as Record<string, unknown>,
      collector: explainCollector,
      detectionRunId: runId,
    });

    if (updated) {
      const count = await this.repository.countActive(record.tenantId);
      proactiveSuggestionEmitter.emit(record.tenantId, 'updated', [record.id], count);
    }
  }
}
