import { getMerchantSettings } from '../../../shared/settings/TenantSettingsService';
import { GoalMetricResolver } from './GoalMetricResolver';
import { GoalRepository } from './GoalRepository';
import type { CreateGoalInput, MerchantGoalRecord, UpdateGoalInput } from './types';
import { GoalValidationError, validateCreateGoalInput } from './goalValidation';
import type { ProactiveSuggestionRepository } from '../proactive/ProactiveSuggestionRepository';
import type { ProactiveSuggestionService } from '../proactive/ProactiveSuggestionService';
import { GoalProgressService } from './GoalProgressService';
import type { GoalOutcomeAttributionService } from './GoalOutcomeAttributionService';
import type { GoalSuggestionRepository } from './suggestions/GoalSuggestionRepository';
import type { GoalSuggestionEngine } from './suggestions/GoalSuggestionEngine';
import { GoalConflictAnalyzer } from './optimization/GoalConflictAnalyzer';
import { GoalPriorityResolver } from './optimization/GoalPriorityResolver';
import type { GoalPlanningOrchestrator } from './planning/GoalPlanningOrchestrator';
import {
  isGoalsEnabled,
  isGoalAiSuggestionsEnabled,
  isGoalMultiOptimizationEnabled,
  isGoalOutcomeAttributionEnabled,
} from './goalConfig';

export class GoalService {
  private conflictAnalyzer = new GoalConflictAnalyzer();
  private priorityResolver = new GoalPriorityResolver();

  constructor(
    private repository: GoalRepository,
    private metricResolver: GoalMetricResolver,
    private progressService: GoalProgressService,
    private proactiveRepository: ProactiveSuggestionRepository,
    private proactiveSuggestionService: ProactiveSuggestionService,
    private outcomeAttribution?: GoalOutcomeAttributionService,
    private suggestionRepository?: GoalSuggestionRepository,
    private suggestionEngine?: GoalSuggestionEngine,
    private planningOrchestrator?: GoalPlanningOrchestrator
  ) {}

  async listGoals(tenantId: string, includeCompleted = false): Promise<MerchantGoalRecord[]> {
    if (!isGoalsEnabled()) return [];
    const flat = await this.repository.listByTenant(tenantId, { includeCompleted, limit: 50 });
    const enriched = await this.enrichOutcomes(tenantId, flat);
    return this.repository.buildGoalTree(enriched);
  }

  async getGoal(tenantId: string, id: string): Promise<MerchantGoalRecord | null> {
    return this.repository.findById(tenantId, id);
  }

  async getGoalWithSnapshots(tenantId: string, id: string) {
    const goal = await this.repository.findById(tenantId, id);
    if (!goal) return null;
    const snapshots = await this.repository.listSnapshots(tenantId, id, 30);
    const children = await this.repository.listChildren(tenantId, id);
    return { goal, snapshots, children };
  }

  async getConflictAnalysis(tenantId: string) {
    if (!isGoalMultiOptimizationEnabled()) {
      return { conflicts: [], ranked: [] };
    }
    const goals = await this.repository.listActiveForProgress(tenantId);
    const conflicts = this.conflictAnalyzer.analyze(goals);
    const ranked = this.priorityResolver.rank(goals, conflicts);
    return { conflicts, ranked };
  }

  async listAiSuggestions(tenantId: string) {
    if (!isGoalAiSuggestionsEnabled() || !this.suggestionRepository) return [];
    return this.suggestionRepository.listPending(tenantId, 10);
  }

  async acceptAiSuggestion(tenantId: string, suggestionId: string) {
    if (!this.suggestionRepository) {
      throw new GoalValidationError('AI-suggesties zijn niet beschikbaar.');
    }
    const suggestion = await this.suggestionRepository.findById(tenantId, suggestionId);
    if (!suggestion || suggestion.status !== 'pending') {
      throw new GoalValidationError('Suggestie niet gevonden.');
    }
    const goal = await this.createGoal(tenantId, {
      title: suggestion.title,
      metricType: suggestion.metricType,
      metricScope: suggestion.metricScope as import('./types').GoalMetricScope,
      targetValue: suggestion.suggestedTarget,
      baselineValue: suggestion.suggestedBaseline,
      deadline: suggestion.suggestedDeadline,
    });
    await this.suggestionRepository.markAccepted(tenantId, suggestionId);
    return goal;
  }

  async dismissAiSuggestion(tenantId: string, suggestionId: string): Promise<void> {
    if (!this.suggestionRepository) return;
    await this.suggestionRepository.markDismissed(tenantId, suggestionId);
  }

  async buildPlan(tenantId: string) {
    if (!this.planningOrchestrator) return null;
    return this.planningOrchestrator.buildPlan(tenantId);
  }

  async getActivePlan(tenantId: string) {
    if (!this.planningOrchestrator) return null;
    return this.planningOrchestrator.getActivePlan(tenantId);
  }

  async createGoal(tenantId: string, input: CreateGoalInput): Promise<MerchantGoalRecord> {
    if (!isGoalsEnabled()) {
      throw new GoalValidationError('Doelen zijn niet ingeschakeld.');
    }

    validateCreateGoalInput(input);

    const settings = await getMerchantSettings(tenantId);
    if (!settings.goalPrefs.enabled) {
      throw new GoalValidationError('Doelen zijn uitgeschakeld in instellingen.');
    }

    if (input.parentGoalId) {
      await this.repository.validateParentGoal(tenantId, input.parentGoalId);
    }

    const activeCount = await this.repository.countActive(tenantId);
    if (activeCount >= settings.goalPrefs.maxActive) {
      throw new GoalValidationError(
        `Maximaal ${settings.goalPrefs.maxActive} actieve doelen toegestaan.`
      );
    }

    const baseline =
      input.baselineValue ??
      (await this.metricResolver.resolveBaseline(tenantId, input.metricType, input.metricScope ?? {}));

    const pursuitMode = input.pursuitMode ?? settings.goalPrefs.defaultPursuitMode;
    const goal = await this.repository.create(tenantId, { ...input, pursuitMode }, baseline);

    await this.progressService.refreshGoal(tenantId, goal.id, 'manual');
    const refreshed = await this.repository.findById(tenantId, goal.id);
    return refreshed ?? goal;
  }

  async updateGoal(
    tenantId: string,
    id: string,
    patch: UpdateGoalInput
  ): Promise<MerchantGoalRecord | null> {
    return this.repository.update(tenantId, id, patch);
  }

  async deleteGoal(tenantId: string, id: string): Promise<boolean> {
    return this.repository.abandon(tenantId, id);
  }

  async refreshGoal(tenantId: string, id: string) {
    return this.progressService.refreshGoal(tenantId, id, 'manual');
  }

  async listLinkedSuggestions(tenantId: string, goalId: string) {
    const rows = await this.proactiveRepository.listByGoalId(tenantId, goalId, 10);
    return rows.map((r) => this.proactiveSuggestionService.toDto(r));
  }

  async listTopLevelGoals(tenantId: string): Promise<MerchantGoalRecord[]> {
    const goals = await this.repository.listByTenant(tenantId, { limit: 50 });
    return goals.filter((g) => !g.parentGoalId && g.status === 'active');
  }

  private async enrichOutcomes(
    tenantId: string,
    goals: MerchantGoalRecord[]
  ): Promise<MerchantGoalRecord[]> {
    if (!isGoalOutcomeAttributionEnabled() || !this.outcomeAttribution) return goals;
    return Promise.all(
      goals.map(async (goal) => {
        if (goal.status !== 'completed') return goal;
        const outcome = await this.outcomeAttribution!.findLatestForGoal(tenantId, goal.id);
        if (!outcome) return goal;
        return {
          ...goal,
          outcomeRecordId: outcome.id,
          verifiedUplift: outcome.uplift,
        };
      })
    );
  }
}

export { GoalValidationError };
