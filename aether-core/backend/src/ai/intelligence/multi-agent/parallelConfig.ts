export function getMaxParallelAgents(): number {
  const raw = process.env.MULTI_AGENT_MAX_PARALLEL_AGENTS;
  const n = raw ? Number(raw) : 3;
  if (!Number.isFinite(n) || n < 1) return 3;
  return Math.min(Math.floor(n), 5);
}

export function isAdaptiveRoutingEnabled(): boolean {
  return process.env.MULTI_AGENT_ADAPTIVE_ROUTING === 'true';
}

export function isNestedPlansEnabled(): boolean {
  return process.env.MULTI_AGENT_NESTED_PLANS === 'true';
}

export function isDirectPeerEnabled(): boolean {
  return process.env.MULTI_AGENT_DIRECT_PEER === 'true';
}

/** Run agent tasks with a concurrency cap. */
export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  if (tasks.length === 0) return [];
  const cap = Math.max(1, limit);
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await tasks[index]!();
    }
  }

  const workers = Array.from({ length: Math.min(cap, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
