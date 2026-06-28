import type { BrainContext } from './types';

export interface AgentStatePort {
  getState(tenantId: string, sessionKey?: string): Promise<BrainContext | null>;
  saveState(tenantId: string, state: BrainContext, sessionKey?: string): Promise<void>;
}
