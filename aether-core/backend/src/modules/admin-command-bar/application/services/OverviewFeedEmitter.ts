import type { OverviewFeedItem } from './OverviewFeedService';

export type OverviewFeedEventType = 'created' | 'updated' | 'removed';

export interface OverviewFeedEmitterEvent {
  type: OverviewFeedEventType;
  item: OverviewFeedItem;
  ts: number;
}

type Listener = (event: OverviewFeedEmitterEvent) => void;

function isOverviewSseEnabled(): boolean {
  const v = process.env.OVERVIEW_SSE_ENABLED;
  if (v === 'false' || v === '0') return false;
  return v === 'true' || v === '1' || process.env.NODE_ENV === 'production';
}

class OverviewFeedEmitterImpl {
  private listeners = new Map<string, Set<Listener>>();

  subscribe(tenantId: string, listener: Listener): () => void {
    let set = this.listeners.get(tenantId);
    if (!set) {
      set = new Set();
      this.listeners.set(tenantId, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.listeners.delete(tenantId);
    };
  }

  emit(tenantId: string, type: OverviewFeedEventType, item: OverviewFeedItem): void {
    if (!isOverviewSseEnabled()) return;
    const event: OverviewFeedEmitterEvent = { type, item, ts: Date.now() };
    const set = this.listeners.get(tenantId);
    if (!set) return;
    for (const listener of set) {
      try {
        listener(event);
      } catch {
        // ignore subscriber errors
      }
    }
  }
}

export const overviewFeedEmitter = new OverviewFeedEmitterImpl();

export { isOverviewSseEnabled };
