import { getMerchantSettings } from './TenantSettingsService';
import { resolveAgentOverride } from './autonomyTypes';

/**
 * Returns true when the merchant has paused this specialist (enabled === false).
 * Missing override means enabled.
 */
export async function isAgentPaused(tenantId: string, agentKey: string): Promise<boolean> {
  const settings = await getMerchantSettings(tenantId);
  const override = resolveAgentOverride(settings.autonomyPrefs, agentKey);
  return override?.enabled === false;
}

export function isAgentPausedFromPrefs(
  autonomyPrefs: { agentOverrides?: Record<string, { enabled?: boolean }> } | undefined,
  agentKey: string
): boolean {
  const override = autonomyPrefs?.agentOverrides?.[agentKey];
  return override?.enabled === false;
}
