import { logger } from '../../../shared/logging/logger';
import { isGoalFederatedPatternsEnabled } from '../goalConfig';

export class GoalPatternDistillJob {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    if (!isGoalFederatedPatternsEnabled()) {
      logger.info('goal_pattern_distill_job_disabled');
      return;
    }
    this.timer = setInterval(() => {
      logger.debug('goal_pattern_distill_tick');
    }, 60 * 60 * 1000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }
}

export const goalPatternDistillJob = new GoalPatternDistillJob();
