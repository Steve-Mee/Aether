export interface LoRAContext {
  adapterId: string;
  version: string;
  traits: string[];
}

export interface LoRAAdapterPort {
  loadContext(tenantId: string): Promise<LoRAContext>;
}
