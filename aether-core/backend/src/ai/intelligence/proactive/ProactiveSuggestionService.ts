import type { AdminDataPort } from '../../../modules/admin-command-bar/application/ports/AdminDataPort';
import { getMerchantSettings } from '../../../shared/settings/TenantSettingsService';
import { isProactiveBrainEnabled } from './proactiveConfig';
import type { ProactiveFinding } from './ProactiveTriggerDefinition';
import { ProactiveEvaluator } from './ProactiveEvaluator';
import {
  ProactiveSuggestionRepository,
  type ProactiveSuggestionRecord,
} from './ProactiveSuggestionRepository';
import { defaultProactiveTriggerRegistry } from './ProactiveTriggerRegistry';
import {
  filterProactiveByPrefs,
  proactivePrefsAllowsIngest,
} from './proactivePrefsFilter';
import { CrossTriggerDedupeService } from './dedupe/CrossTriggerDedupeService';
import { proactiveSuggestionEmitter } from './ProactiveSuggestionEmitter';
import { notifyOverviewProactive } from '../../../modules/admin-command-bar/application/services/OverviewFeedNotify';
import type { ProactiveLearningService } from './learning/ProactiveLearningService';
import type { ProactiveEnrichmentService } from './enrichment/ProactiveEnrichmentService';
import type { ProactiveAutoExecuteService } from './execution/ProactiveAutoExecuteService';
import type { ProactiveNotificationDispatcher } from './notifications/ProactiveNotificationDispatcher';
import type { ProactivePatternContributionService } from './global/ProactivePatternContributionService';
import type { ProactiveGlobalHintService } from './global/ProactiveGlobalHintService';
import type { ProactiveDetectionOrchestrator } from './orchestration/ProactiveDetectionOrchestrator';
import { persistProactiveExplainability } from '../../../shared/explain/ExplainabilityService';
import { explainabilityPersister } from '../explainability/ExplainabilityPersister';
import type { GoalSuggestionLinker } from '../goals/GoalSuggestionLinker';
import { isGoalsEnabled } from '../goals/goalConfig';

export interface ProactiveSuggestionDto {
  id: string;
  label: string;
  command: string;
  intentId: string;
  category: string;
  hint?: string;
  executionMode?: 'autonomous' | 'approval_required' | 'inform_only';
  badge?: string;
  source: string;
  priority: number;
  triggerId: string;
  agentKey?: string;
  riskLevel: string;
  hasExplainability?: boolean;
  goalId?: string;
}

export interface ProactiveSuggestionServiceDeps {
  dedupe?: CrossTriggerDedupeService;
  learning?: ProactiveLearningService;
  enrichment?: ProactiveEnrichmentService;
  autoExecute?: ProactiveAutoExecuteService;
  notifications?: ProactiveNotificationDispatcher;
  globalContribution?: ProactivePatternContributionService;
  globalHints?: ProactiveGlobalHintService;
  detectionOrchestrator?: ProactiveDetectionOrchestrator;
  goalLinker?: GoalSuggestionLinker;
}

export class ProactiveSuggestionService {
  private evaluator: ProactiveEvaluator;
  private registry = defaultProactiveTriggerRegistry;
  private dedupe: CrossTriggerDedupeService;

  constructor(
    private repository: ProactiveSuggestionRepository,
    private adminData: AdminDataPort,
    evaluator?: ProactiveEvaluator,
    private deps: ProactiveSuggestionServiceDeps = {}
  ) {
    this.evaluator = evaluator ?? new ProactiveEvaluator(this.registry);
    this.dedupe = deps.dedupe ?? new CrossTriggerDedupeService();
  }

  async ingestFindings(tenantId: string, findings: ProactiveFinding[]): Promise<number> {
    if (!isProactiveBrainEnabled()) return 0;
    const settings = await getMerchantSettings(tenantId);
    if (!proactivePrefsAllowsIngest(settings.proactivePrefs)) return 0;

    let normalized = this.dedupe.normalize(findings);
    if (isGoalsEnabled() && settings.goalPrefs.enabled && this.deps.goalLinker) {
      normalized = await Promise.all(
        normalized.map((f) => this.deps.goalLinker!.linkFinding(tenantId, f))
      );
    }

    const ingestedIds: string[] = [];
    let ingested = 0;

    for (const finding of normalized) {
      if (this.deps.learning) {
        const suppress = await this.deps.learning.shouldSuppress(
          tenantId,
          finding.triggerId,
          finding.agentKey
        );
        if (suppress) continue;
      }

      const trigger = this.registry.get(finding.triggerId);
      let cooldownMs = trigger?.cooldownMs ?? 24 * 60 * 60 * 1000;
      if (this.deps.learning) {
        cooldownMs = await this.deps.learning.getExtendedCooldownMs(
          tenantId,
          finding.triggerId,
          cooldownMs,
          finding.agentKey
        );
      }

      let priority = finding.priority;
      if (this.deps.learning) {
        priority += await this.deps.learning.getPriorityBoost(
          tenantId,
          finding.triggerId,
          finding.agentKey
        );
      }
      if (this.deps.globalHints) {
        priority += await this.deps.globalHints.getPriorityAdjust(tenantId, finding.triggerId);
      }

      const upserted = await this.repository.upsertFinding(
        tenantId,
        { ...finding, priority },
        cooldownMs
      );
      if (upserted) {
        if (upserted.created) {
          ingested += 1;
          ingestedIds.push(upserted.record.id);
          void persistProactiveExplainability({
            tenantId,
            suggestionId: upserted.record.id,
            triggerId: upserted.record.triggerId,
            agentKey: upserted.record.agentKey ?? undefined,
            title: upserted.record.title,
            evidence: (upserted.record.evidence ?? {}) as Record<string, unknown>,
            goalId: upserted.record.goalId ?? undefined,
          });
          if (this.deps.enrichment) {
            void this.deps.enrichment.enqueue(upserted.record);
          }
          if (this.deps.detectionOrchestrator) {
            void this.deps.detectionOrchestrator.enqueue(upserted.record);
          }
          if (this.deps.notifications) {
            void this.deps.notifications.notifyCreated(tenantId, upserted.record);
          }
        }
      }
    }

    if (ingestedIds.length > 0) {
      const count = await this.repository.countActive(tenantId);
      proactiveSuggestionEmitter.emit(tenantId, 'created', ingestedIds, count);
      for (const id of ingestedIds) {
        const record = await this.repository.findById(tenantId, id);
        if (record) notifyOverviewProactive(tenantId, 'created', record);
      }
    }

    return ingested;
  }

  async ingestFinding(
    tenantId: string,
    finding: ProactiveFinding,
    cooldownMs = 24 * 60 * 60 * 1000
  ): Promise<number> {
    if (!isProactiveBrainEnabled()) return 0;
    const settings = await getMerchantSettings(tenantId);
    if (!proactivePrefsAllowsIngest(settings.proactivePrefs)) return 0;

    let linked = finding;
    if (isGoalsEnabled() && settings.goalPrefs.enabled && this.deps.goalLinker) {
      linked = await this.deps.goalLinker.linkFinding(tenantId, finding);
    }

    const upserted = await this.repository.upsertFinding(tenantId, linked, cooldownMs);
    if (!upserted?.created) return 0;

    void persistProactiveExplainability({
      tenantId,
      suggestionId: upserted.record.id,
      triggerId: upserted.record.triggerId,
      agentKey: upserted.record.agentKey ?? undefined,
      title: upserted.record.title,
      evidence: (upserted.record.evidence ?? {}) as Record<string, unknown>,
      goalId: upserted.record.goalId ?? undefined,
    });
    if (this.deps.enrichment) {
      void this.deps.enrichment.enqueue(upserted.record);
    }
    if (this.deps.detectionOrchestrator) {
      void this.deps.detectionOrchestrator.enqueue(upserted.record);
    }
    if (this.deps.notifications) {
      void this.deps.notifications.notifyCreated(tenantId, upserted.record);
    }

    const count = await this.repository.countActive(tenantId);
    proactiveSuggestionEmitter.emit(tenantId, 'created', [upserted.record.id], count);
    notifyOverviewProactive(tenantId, 'created', upserted.record);
    return 1;
  }

  async evaluateAndIngestPeriodic(tenantId: string): Promise<number> {
    if (!isProactiveBrainEnabled()) return 0;
    await this.repository.expireStale(tenantId);
    const findings = await this.evaluator.evaluatePeriodic(tenantId, this.adminData);
    const ingested = await this.ingestFindings(tenantId, findings);

    if (this.deps.enrichment) {
      await this.deps.enrichment.processPendingBatch(tenantId);
    }
    if (this.deps.autoExecute) {
      await this.deps.autoExecute.evaluateCandidates(tenantId);
    }

    return ingested;
  }

  async evaluateAndIngestEvent(
    tenantId: string,
    eventType: string,
    eventPayload: Record<string, unknown>
  ): Promise<number> {
    if (!isProactiveBrainEnabled()) return 0;
    const findings = await this.evaluator.evaluateEvent(
      tenantId,
      this.adminData,
      eventType,
      eventPayload
    );
    const ingested = await this.ingestFindings(tenantId, findings);

    if (this.deps.enrichment) {
      await this.deps.enrichment.processPendingBatch(tenantId);
    }

    return ingested;
  }

  async listActiveDtos(tenantId: string): Promise<ProactiveSuggestionDto[]> {
    const settings = await getMerchantSettings(tenantId);
    if (!settings.proactivePrefs.enabled || settings.proactivePrefs.visibility === 'off') {
      return [];
    }

    await this.repository.expireStale(tenantId);
    const rows = await this.repository.listActive(tenantId, settings.proactivePrefs.maxActive * 2);
    const merged = this.dedupe.mergeActive(rows);
    const filtered = filterProactiveByPrefs(merged, settings.proactivePrefs);
    const explainIds = await explainabilityPersister.listSourceIdsWithSnapshots(
      tenantId,
      'proactive_suggestion',
      filtered.map((r) => r.id)
    );

    return filtered.map((r) => this.toDto(r, explainIds.has(r.id)));
  }

  toDto(record: ProactiveSuggestionRecord, hasExplainability = false): ProactiveSuggestionDto {
    const evidence = record.evidence ?? {};
    let hint: string | undefined;
    if (typeof evidence.changePercent === 'number') {
      hint = `${evidence.changePercent}% prijsdaling`;
    } else if (typeof evidence.lowMarginCount === 'number') {
      hint = `${evidence.lowMarginCount} SKU's`;
    } else if (typeof evidence.lowStockCount === 'number') {
      hint = `${evidence.lowStockCount} low-stock`;
    } else if (typeof evidence.trendPct === 'number') {
      hint = `${Math.abs(evidence.trendPct as number).toFixed(0)}% trend`;
    }

    return {
      id: record.id,
      label: record.title,
      command: record.command,
      intentId: record.intentId,
      category: this.mapCategoryForUi(record.category),
      hint,
      executionMode: record.executionMode as ProactiveSuggestionDto['executionMode'],
      badge: 'AETHER stelt voor',
      source: 'proactive',
      priority: record.priority + 20,
      triggerId: record.triggerId,
      agentKey: record.agentKey ?? undefined,
      riskLevel: record.riskLevel,
      hasExplainability,
      goalId: record.goalId ?? undefined,
    };
  }

  private mapCategoryForUi(category: string): string {
    if (category === 'voorraad') return 'orders';
    if (category === 'algemeen') return 'overzicht';
    return category;
  }

  private async emitDismissed(tenantId: string, id: string, record?: ProactiveSuggestionRecord): Promise<void> {
    const count = await this.repository.countActive(tenantId);
    proactiveSuggestionEmitter.emit(tenantId, 'dismissed', [id], count);
    if (record) notifyOverviewProactive(tenantId, 'removed', record);
  }

  private async recordGlobalFeedback(
    tenantId: string,
    record: ProactiveSuggestionRecord,
    action: 'executed' | 'dismissed' | 'snoozed'
  ): Promise<void> {
    if (!this.deps.globalContribution) return;
    await this.deps.globalContribution.recordOutcome(tenantId, {
      action,
      triggerId: record.triggerId,
      agentKey: record.agentKey ?? undefined,
      riskLevel: record.riskLevel,
    });
  }

  async dismiss(tenantId: string, id: string): Promise<boolean> {
    const record = await this.repository.findById(tenantId, id);
    const ok = await this.repository.dismiss(tenantId, id);
    if (ok && record) {
      if (this.deps.learning) {
        await this.deps.learning.recordFeedback(tenantId, {
          action: 'dismissed',
          triggerId: record.triggerId,
          agentKey: record.agentKey ?? undefined,
          riskLevel: record.riskLevel,
        });
      }
      await this.recordGlobalFeedback(tenantId, record, 'dismissed');
      await this.emitDismissed(tenantId, id, record);
    }
    return ok;
  }

  async snooze(tenantId: string, id: string, hours?: number): Promise<boolean> {
    const settings = await getMerchantSettings(tenantId);
    const h = hours ?? settings.proactivePrefs.snoozeDefaultHours;
    const until = new Date(Date.now() + h * 60 * 60 * 1000);
    const record = await this.repository.findById(tenantId, id);
    const ok = await this.repository.snooze(tenantId, id, until);
    if (ok && record) {
      if (this.deps.learning) {
        await this.deps.learning.recordFeedback(tenantId, {
          action: 'snoozed',
          triggerId: record.triggerId,
          agentKey: record.agentKey ?? undefined,
          riskLevel: record.riskLevel,
        });
      }
      await this.recordGlobalFeedback(tenantId, record, 'snoozed');
      await this.emitDismissed(tenantId, id, record);
    }
    return ok;
  }

  async markExecuted(tenantId: string, id: string): Promise<boolean> {
    const record = await this.repository.findById(tenantId, id);
    const ok = await this.repository.markExecuted(tenantId, id);
    if (ok && record) {
      if (this.deps.learning) {
        await this.deps.learning.recordFeedback(tenantId, {
          action: 'executed',
          triggerId: record.triggerId,
          agentKey: record.agentKey ?? undefined,
          riskLevel: record.riskLevel,
        });
      }
      await this.recordGlobalFeedback(tenantId, record, 'executed');
      await this.emitDismissed(tenantId, id, record);
    }
    return ok;
  }

  async getById(tenantId: string, id: string): Promise<ProactiveSuggestionRecord | null> {
    return this.repository.findById(tenantId, id);
  }

  async countActive(tenantId: string): Promise<number> {
    return this.repository.countActive(tenantId);
  }

  setAutoExecute(service: ProactiveAutoExecuteService): void {
    this.deps.autoExecute = service;
  }
}
