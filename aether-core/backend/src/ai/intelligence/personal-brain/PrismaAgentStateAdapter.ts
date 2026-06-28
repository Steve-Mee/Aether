import { prisma } from '../../../shared/prisma/client';
import { requireTenantId } from '../../../shared/tenant/tenantContext';
import type { AgentStatePort } from './AgentStatePort';
import type { BrainContext } from './types';

const DEFAULT_SESSION = 'default';

export class PrismaAgentStateAdapter implements AgentStatePort {
  async getState(tenantId: string, sessionKey = DEFAULT_SESSION): Promise<BrainContext | null> {
    const tid = requireTenantId(tenantId, 'PrismaAgentStateAdapter.getState');
    const row = await prisma.brainAgentState.findUnique({
      where: { tenantId_sessionKey: { tenantId: tid, sessionKey } },
    });
    if (!row) return null;
    return row.state as unknown as BrainContext;
  }

  async saveState(
    tenantId: string,
    state: BrainContext,
    sessionKey = DEFAULT_SESSION
  ): Promise<void> {
    const tid = requireTenantId(tenantId, 'PrismaAgentStateAdapter.saveState');
    await prisma.brainAgentState.upsert({
      where: { tenantId_sessionKey: { tenantId: tid, sessionKey } },
      create: { tenantId: tid, sessionKey, state: state as object },
      update: { state: state as object },
    });
  }
}

export class InMemoryAgentStateAdapter implements AgentStatePort {
  private store = new Map<string, BrainContext>();

  async getState(tenantId: string, sessionKey = DEFAULT_SESSION): Promise<BrainContext | null> {
    return this.store.get(`${tenantId}:${sessionKey}`) ?? null;
  }

  async saveState(
    tenantId: string,
    state: BrainContext,
    sessionKey = DEFAULT_SESSION
  ): Promise<void> {
    this.store.set(`${tenantId}:${sessionKey}`, state);
  }

  clear(): void {
    this.store.clear();
  }
}
