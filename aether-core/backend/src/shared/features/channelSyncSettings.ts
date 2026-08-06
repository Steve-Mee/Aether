import { prisma } from '../../../shared/prisma/client';
import { isFeatureEnabled } from '../featureFlags';

function readEnvFlag(feature: string): boolean | undefined {
  const envKey = `FEATURE_${feature.toUpperCase().replace(/-/g, '_')}`;
  if (process.env[envKey] === 'true') return true;
  if (process.env[envKey] === 'false') return false;
  if (feature === 'channel-sync') {
    if (process.env.CHANNEL_SYNC_ENABLED === 'true') return true;
    if (process.env.CHANNEL_SYNC_ENABLED === 'false') return false;
  }
  return undefined;
}

export function getChannelSyncEnvOverride(): boolean | undefined {
  return readEnvFlag('channel-sync');
}

export async function getChannelSyncSettings(tenantId: string): Promise<{
  tenantEnabled: boolean;
  envOverride: boolean | null;
  effectiveEnabled: boolean;
}> {
  const envOverride = getChannelSyncEnvOverride();
  let tenantEnabled = false;

  try {
    const row = await prisma.tenantFeature.findUnique({
      where: { tenantId_feature: { tenantId, feature: 'channel-sync' } },
    });
    tenantEnabled = row?.enabled ?? false;
  } catch {
    tenantEnabled = false;
  }

  const effectiveEnabled = await isFeatureEnabled(tenantId, 'channel-sync');

  return {
    tenantEnabled,
    envOverride: envOverride ?? null,
    effectiveEnabled,
  };
}

export async function setChannelSyncTenantEnabled(
  tenantId: string,
  enabled: boolean
): Promise<{ tenantEnabled: boolean; effectiveEnabled: boolean; envOverride: boolean | null }> {
  await prisma.tenantFeature.upsert({
    where: { tenantId_feature: { tenantId, feature: 'channel-sync' } },
    create: { tenantId, feature: 'channel-sync', enabled },
    update: { enabled },
  });

  const settings = await getChannelSyncSettings(tenantId);
  return {
    tenantEnabled: settings.tenantEnabled,
    effectiveEnabled: settings.effectiveEnabled,
    envOverride: settings.envOverride,
  };
}
