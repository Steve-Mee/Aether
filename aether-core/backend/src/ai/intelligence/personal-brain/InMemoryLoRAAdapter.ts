import type { LoRAAdapterPort, LoRAContext } from './LoRAAdapterPort';
import type { LoRAAdapterRecord, LoRAAdapterRegistryPort } from './LoRAAdapterRegistryPort';

/**
 * Placeholder until per-merchant LoRA adapter registry is implemented.
 * In-memory registry for tests.
 */
export class InMemoryLoRAAdapter implements LoRAAdapterRegistryPort {
  private store = new Map<string, LoRAAdapterRecord[]>();

  async loadContext(tenantId: string): Promise<LoRAContext> {
    const rows = this.store.get(tenantId) ?? [];
    const active = rows.find((r) => r.enabled);
    if (active) {
      return {
        adapterId: active.adapterId,
        version: active.version,
        traits: active.traits,
      };
    }
    return {
      adapterId: `lora-${tenantId.slice(0, 8)}`,
      version: '0.0.0',
      traits: [],
    };
  }

  async register(tenantId: string, record: LoRAAdapterRecord): Promise<void> {
    const rows = this.store.get(tenantId) ?? [];
    const idx = rows.findIndex((r) => r.adapterId === record.adapterId);
    if (idx >= 0) rows[idx] = record;
    else rows.push(record);
    this.store.set(tenantId, rows);
  }

  async list(tenantId: string): Promise<LoRAAdapterRecord[]> {
    return this.store.get(tenantId) ?? [];
  }

  clear(): void {
    this.store.clear();
  }
}
