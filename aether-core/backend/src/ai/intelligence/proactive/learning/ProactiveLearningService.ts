import type { PersonalBrainRegistry } from '../../personal-brain/PersonalBrainRegistry';
import { resolveMemoryAgentKey } from '../../personal-brain/memory/agentKey';
import { getMerchantSettings } from '../../../../shared/settings/TenantSettingsService';
import { isProactiveLearningEnabled, PROACTIVE_LEARNING_WINDOW_DAYS } from '../proactiveConfig';

export type ProactiveLearningPreference = 'prefer_suppress' | 'prefer_surface' | 'prefer_confirm' | null;

interface ProactiveDecisionMemory {
  action: 'executed' | 'dismissed' | 'snoozed';
  triggerId: string;
  agentKey?: string;
  riskLevel?: string;
  recordedAt?: string;
}

function parseDecision(content: string): ProactiveDecisionMemory | null {
  try {
    const parsed = JSON.parse(content) as ProactiveDecisionMemory;
    if (parsed.action && parsed.triggerId) return parsed;
  } catch {
    // ignore
  }
  return null;
}

function isWithinWindow(recordedAt: string | undefined): boolean {
  if (!recordedAt) return true;
  const ts = Date.parse(recordedAt);
  if (Number.isNaN(ts)) return true;
  const windowMs = PROACTIVE_LEARNING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - ts <= windowMs;
}

export class ProactiveLearningService {
  constructor(private personalBrains: PersonalBrainRegistry) {}

  private async isLearningAllowed(tenantId: string): Promise<boolean> {
    if (!isProactiveLearningEnabled()) return false;
    const settings = await getMerchantSettings(tenantId);
    return settings.brainAdaptiveLearningEnabled !== false;
  }

  async recordFeedback(
    tenantId: string,
    params: {
      action: 'executed' | 'dismissed' | 'snoozed';
      triggerId: string;
      agentKey?: string;
      riskLevel?: string;
    }
  ): Promise<void> {
    if (!(await this.isLearningAllowed(tenantId))) return;
    const brain = this.personalBrains.get(tenantId, resolveMemoryAgentKey(params.agentKey));
    await brain.remember({
      command: `proactive_decision:${params.triggerId}`,
      intent: params.triggerId,
      result: JSON.stringify({
        action: params.action,
        triggerId: params.triggerId,
        agentKey: params.agentKey,
        riskLevel: params.riskLevel,
        recordedAt: new Date().toISOString(),
      }),
    });
  }

  async getPreference(
    tenantId: string,
    triggerId: string,
    agentKey?: string
  ): Promise<ProactiveLearningPreference> {
    if (!(await this.isLearningAllowed(tenantId))) return null;

    const brain = this.personalBrains.get(tenantId, resolveMemoryAgentKey(agentKey));
    const recall = await brain.recall(`proactive_decision:${triggerId}`, 20);

    let executed = 0;
    let dismissed = 0;
    let snoozed = 0;

    for (const snippet of recall.snippets) {
      const decision = parseDecision(snippet);
      if (!decision || decision.triggerId !== triggerId) continue;
      if (!isWithinWindow(decision.recordedAt)) continue;
      if (decision.action === 'executed') executed += 1;
      else if (decision.action === 'dismissed') dismissed += 1;
      else if (decision.action === 'snoozed') snoozed += 1;
    }

    if (dismissed >= 3) return 'prefer_suppress';
    if (snoozed >= 2) return 'prefer_confirm';
    if (executed >= 3) return 'prefer_surface';
    return null;
  }

  async shouldSuppress(tenantId: string, triggerId: string, agentKey?: string): Promise<boolean> {
    const pref = await this.getPreference(tenantId, triggerId, agentKey);
    return pref === 'prefer_suppress';
  }

  async getPriorityBoost(tenantId: string, triggerId: string, agentKey?: string): Promise<number> {
    const pref = await this.getPreference(tenantId, triggerId, agentKey);
    if (pref === 'prefer_surface') return 1;
    if (pref === 'prefer_suppress') return -5;
    return 0;
  }

  async getExtendedCooldownMs(
    tenantId: string,
    triggerId: string,
    baseCooldownMs: number,
    agentKey?: string
  ): Promise<number> {
    const pref = await this.getPreference(tenantId, triggerId, agentKey);
    if (pref === 'prefer_confirm') return Math.max(baseCooldownMs, 48 * 60 * 60 * 1000);
    return baseCooldownMs;
  }
}
