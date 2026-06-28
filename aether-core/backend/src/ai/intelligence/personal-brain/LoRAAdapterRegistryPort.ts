import type { LoRAAdapterPort, LoRAContext } from './LoRAAdapterPort';

export interface LoRAAdapterRecord {
  adapterId: string;
  version: string;
  storagePath: string;
  traits: string[];
  enabled: boolean;
}

export interface LoRAAdapterRegistryPort extends LoRAAdapterPort {
  register(tenantId: string, record: LoRAAdapterRecord): Promise<void>;
  list(tenantId: string): Promise<LoRAAdapterRecord[]>;
}
