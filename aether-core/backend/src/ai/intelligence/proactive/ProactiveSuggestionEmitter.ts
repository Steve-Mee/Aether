import { isProactiveSseEnabled } from './proactiveConfig';

export type ProactiveEmitterEventType = 'created' | 'updated' | 'dismissed';

export interface ProactiveEmitterEvent {
  type: ProactiveEmitterEventType;
  ids: string[];
  count: number;
  ts: number;
}

type Listener = (event: ProactiveEmitterEvent) => void;

class ProactiveSuggestionEmitterImpl {
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

  emit(
    tenantId: string,
    type: ProactiveEmitterEventType,
    ids: string[],
    count: number
  ): void {
    if (!isProactiveSseEnabled()) return;
    const event: ProactiveEmitterEvent = { type, ids, count, ts: Date.now() };
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

export const proactiveSuggestionEmitter = new ProactiveSuggestionEmitterImpl();
