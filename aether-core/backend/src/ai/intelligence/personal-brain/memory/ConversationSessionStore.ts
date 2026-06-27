import crypto from 'crypto';
import type { PersonalBrainRegistry } from '../PersonalBrainRegistry';
import type { BrainContext } from '../types';
import { getConversationTurnLimit } from './constants';
import type { ConversationSession, ConversationTurn } from './types';

const DEFAULT_AGENT_KEY = 'admin';

export class ConversationSessionStore {
  constructor(private personalBrains: PersonalBrainRegistry) {}

  private resolveAgentKey(agentKey?: string): string {
    return agentKey?.trim() || DEFAULT_AGENT_KEY;
  }

  async getSession(tenantId: string, agentKey?: string): Promise<ConversationSession | null> {
    const brain = this.personalBrains.get(tenantId, this.resolveAgentKey(agentKey));
    const ctx = await brain.getContext();
    return ctx.conversationSession ?? null;
  }

  async getRecentTurns(tenantId: string, limit?: number, agentKey?: string): Promise<ConversationTurn[]> {
    const session = await this.getSession(tenantId, agentKey);
    if (!session?.turns.length) return [];
    const max = limit ?? getConversationTurnLimit();
    return session.turns.slice(-max);
  }

  async appendTurn(
    tenantId: string,
    turn: Omit<ConversationTurn, 'timestamp'> & { timestamp?: string },
    agentKey?: string
  ): Promise<void> {
    const brain = this.personalBrains.get(tenantId, this.resolveAgentKey(agentKey));
    const ctx = await brain.getContext();
    const limit = getConversationTurnLimit();
    const session = ctx.conversationSession ?? {
      sessionId: crypto.randomUUID(),
      turns: [],
      lastActiveAt: new Date().toISOString(),
    };
    const full: ConversationTurn = {
      ...turn,
      timestamp: turn.timestamp ?? new Date().toISOString(),
    };
    const turns = [...session.turns, full].slice(-limit);
    await brain.updateAgentState({
      conversationSession: {
        ...session,
        turns,
        lastActiveAt: new Date().toISOString(),
      },
    } as Partial<BrainContext>);
  }

  async appendExchange(
    tenantId: string,
    params: { command: string; result: string; commandId?: string },
    agentKey?: string
  ): Promise<void> {
    await this.appendTurn(tenantId, { role: 'user', content: params.command, commandId: params.commandId }, agentKey);
    await this.appendTurn(tenantId, { role: 'assistant', content: params.result, commandId: params.commandId }, agentKey);
  }

  formatForPrompt(turns: ConversationTurn[], maxChars = 800): string {
    if (turns.length === 0) return '';
    const lines: string[] = [];
    let used = 0;
    const header = 'Recente sessie:\n';
    for (const turn of turns.slice(-8)) {
      const line = `- ${turn.role === 'user' ? 'Merchant' : 'AETHER'}: ${turn.content.slice(0, 120)}`;
      if (used + line.length > maxChars && lines.length > 0) break;
      lines.push(line);
      used += line.length + 1;
    }
    if (lines.length === 0) return '';
    return `${header}${lines.join('\n')}`;
  }

  async clearSession(tenantId: string, agentKey?: string): Promise<void> {
    const brain = this.personalBrains.get(tenantId, this.resolveAgentKey(agentKey));
    await brain.updateAgentState({ conversationSession: undefined } as Partial<BrainContext>);
  }
}
