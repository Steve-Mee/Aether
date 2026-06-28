import { eventBus, type DomainEventPayload } from '../../../shared/events/eventBus';
import { getCompositionRoot } from '../../../bootstrap/compositionRoot';
import { isGoalsEnabled, isGoalFederatedPatternsEnabled } from './goalConfig';
import { logger } from '../../../shared/logging/logger';
import { getMerchantSettings } from '../../../shared/settings/TenantSettingsService';
import { GoalPatternDistillationService } from './federated/GoalPatternDistillationService';

const patternDistillation = new GoalPatternDistillationService();

export function registerGoalEventHandlers(): void {
  if (!isGoalsEnabled()) return;

  const refresh = async (tenantId: string, source: 'event' = 'event') => {
    try {
      const { goalProgressService } = getCompositionRoot();
      if (goalProgressService) {
        await goalProgressService.refreshAllActive(tenantId, source);
      }
    } catch (error) {
      logger.warn('goal_event_refresh_failed', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  eventBus.subscribe('command.executed', async (event: DomainEventPayload) => {
    await refresh(event.tenantId);
  });

  eventBus.subscribe('inventory.low_stock_detected', async (event: DomainEventPayload) => {
    await refresh(event.tenantId);
  });

  eventBus.subscribe('supplier.price_changed', async (event: DomainEventPayload) => {
    await refresh(event.tenantId);
  });

  eventBus.subscribe('goal.completed', async (event: DomainEventPayload) => {
    if (!isGoalFederatedPatternsEnabled()) return;
    try {
      const settings = await getMerchantSettings(event.tenantId);
      if (!settings.goalPrefs.allowFederatedContribution) return;
      if (!settings.brainFederatedExecutionContribute) return;

      const goalId = String(event.payload.goalId ?? '');
      if (!goalId) return;
      const { goalService } = getCompositionRoot();
      const goal = await goalService.getGoal(event.tenantId, goalId);
      if (goal) {
        await patternDistillation.contributeCompletion(event.tenantId, goal);
      }
    } catch (error) {
      logger.warn('goal_federated_contribution_failed', {
        tenantId: event.tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
