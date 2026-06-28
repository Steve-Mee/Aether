import { logger } from '../../../../../shared/logging/logger';
import type { RunWorkingMemoryPort } from '../RunWorkingMemoryPort';
import { isRunMemoryGcEnabled, runMemoryGcIntervalMs } from '../runMemoryConfig';

export class RunMemoryGcJob {
  private timer: NodeJS.Timeout | null = null;

  constructor(private memory: RunWorkingMemoryPort) {}

  start(): void {
    if (!isRunMemoryGcEnabled()) return;
    const intervalMs = runMemoryGcIntervalMs();
    void this.runOnce();
    this.timer = setInterval(() => void this.runOnce(), intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async runOnce(): Promise<number> {
    try {
      const purged = await this.memory.purgeExpired();
      if (purged > 0) {
        logger.info('run_memory_gc_completed', { purged });
      }
      return purged;
    } catch (err) {
      logger.warn('run_memory_gc_failed', {
        message: err instanceof Error ? err.message : String(err),
      });
      return 0;
    }
  }
}

export function createRunMemoryGcJob(memory: RunWorkingMemoryPort): RunMemoryGcJob {
  return new RunMemoryGcJob(memory);
}
