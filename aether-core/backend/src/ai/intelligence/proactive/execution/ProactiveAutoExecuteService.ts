import type { ExecuteNaturalLanguageCommandUseCase } from '../../../../modules/admin-command-bar/application/use-cases/ExecuteNaturalLanguageCommandUseCase';
import { getMerchantSettings } from '../../../../shared/settings/TenantSettingsService';
import { writeAuditLog } from '../../../../shared/audit/auditService';
import { persistProactiveAutoExplainability } from '../../../../shared/explain/ExplainabilityService';
import { prisma } from '../../../../shared/prisma/client';
import type { ProactiveSuggestionRepository } from '../ProactiveSuggestionRepository';
import type { ProactiveLearningService } from '../learning/ProactiveLearningService';
import { shouldProactiveAutoExecute } from './ProactiveAutoExecutePolicy';
import {
  isProactiveAutoExecuteEnabled,
  resolveProactiveAutoExecuteCooldownMs,
} from '../proactiveConfig';
import { logger } from '../../../../shared/logging/logger';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { isGoalMultiOptimizationEnabled } from '../../goals/goalConfig';
import { assessAutonomy } from '../../../../shared/policy/AutonomyPolicyService';
import { logAutonomyDecision } from '../../../../shared/policy/AutonomyAuditLogger';

export class ProactiveAutoExecuteService {
  constructor(
    private repository: ProactiveSuggestionRepository,
    private learning: ProactiveLearningService,
    private executeCommand: ExecuteNaturalLanguageCommandUseCase
  ) {}

  private async lastAutoExecuteAt(tenantId: string): Promise<Date | null> {
    const row = await prisma.auditLog.findFirst({
      where: { tenantId, action: 'proactive_auto_executed' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return row?.createdAt ?? null;
  }

  async evaluateCandidates(tenantId: string): Promise<number> {
    if (!isProactiveAutoExecuteEnabled()) return 0;

    const settings = await getMerchantSettings(tenantId);
    if (!settings.proactivePrefs.allowAutoExecute) return 0;

    const candidates = await this.repository.listAutoExecuteCandidates(tenantId, 3);
    const lastRun = await this.lastAutoExecuteAt(tenantId);
    const cooldownMs = resolveProactiveAutoExecuteCooldownMs();
    let executed = 0;

    let conflictGoalIds: Set<string> | undefined;
    if (isGoalMultiOptimizationEnabled()) {
      try {
        const { goalService } = getCompositionRoot();
        const analysis = await goalService.getConflictAnalysis(tenantId);
        conflictGoalIds = new Set(analysis.conflicts.flatMap((c) => c.goalIds));
      } catch {
        conflictGoalIds = undefined;
      }
    }

    for (const record of candidates) {
      const learningPref = await this.learning.getPreference(
        tenantId,
        record.triggerId,
        record.agentKey ?? undefined
      );
      const gate = shouldProactiveAutoExecute({
        settings,
        record,
        learningPref,
        lastAutoExecuteAt: lastRun,
        cooldownMs,
        conflictGoalIds,
      });

      const assessment = assessAutonomy({
        settings,
        module: 'proactive-brain',
        actionType: record.triggerId,
        triggerId: record.triggerId,
        agentKey: record.agentKey ?? undefined,
        payload: { command: record.command },
        riskClass: 'low',
      });

      if (!gate.eligible) {
        await logAutonomyDecision({
          tenantId,
          source: 'proactive',
          assessment: {
            ...assessment,
            eligible: false,
            reason: gate.reason,
            executionMode:
              assessment.executionMode === 'autonomous' ? 'blocked' : assessment.executionMode,
          },
          preset: settings.autonomyPrefs.preset,
          relatedId: record.id,
          actor: 'proactive_auto_execute',
        });
        continue;
      }

      try {
        const result = await this.executeCommand.execute(record.command, {
          tenantId,
          actorId: 'proactive_auto_execute',
        });
        if (result.success && result.commandId) {
          await persistProactiveAutoExplainability({
            tenantId,
            suggestionId: record.id,
            commandId: result.commandId,
            triggerId: record.triggerId,
            agentKey: record.agentKey ?? undefined,
            title: record.title,
          });
        }
        await this.repository.markExecuted(tenantId, record.id);
        await logAutonomyDecision({
          tenantId,
          source: 'proactive',
          assessment: { ...assessment, eligible: true, executionMode: 'autonomous' },
          preset: settings.autonomyPrefs.preset,
          relatedId: record.id,
          actor: 'proactive_auto_execute',
        });
        await writeAuditLog({
          tenantId,
          module: 'proactive-brain',
          action: 'proactive_auto_executed',
          actor: 'proactive_auto_execute',
          details: {
            suggestionId: record.id,
            triggerId: record.triggerId,
            command: record.command,
            reason: gate.reason,
            agentKey: record.agentKey,
          },
        });
        executed += 1;
        logger.info('proactive_auto_executed', {
          tenantId,
          suggestionId: record.id,
          triggerId: record.triggerId,
        });
        break;
      } catch (err) {
        logger.warn('proactive_auto_execute_failed', {
          tenantId,
          suggestionId: record.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return executed;
  }
}
