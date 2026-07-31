import { prisma } from '../prisma/client';

const DEFAULT_FLAGS: Record<string, boolean> = {
  predictive: false,
  'self-evolving': false,
  physical: false,
  'co-ownership': false,
  agentic: true,
  /** Admin website APIs + agents (P03+). Also: STOREFRONT_BUILDER_ENABLED / FEATURE_STOREFRONT_BUILDER */
  'storefront-builder': false,
  /** Public storefront read API (P04). Also: STOREFRONT_PUBLIC_API_ENABLED / FEATURE_STOREFRONT_PUBLIC_API */
  'storefront-public-api': false,
};

/** Contract error codes for gated features (contracts §6). */
const FEATURE_DISABLED_CODES: Record<string, string> = {
  'storefront-builder': 'WEBSITE_DISABLED',
  'storefront-public-api': 'STOREFRONT_PUBLIC_DISABLED',
};

/** Extra env aliases beyond FEATURE_<KEY> (playbook §C). */
const FEATURE_ENV_ALIASES: Record<string, string> = {
  'storefront-builder': 'STOREFRONT_BUILDER_ENABLED',
  'storefront-public-api': 'STOREFRONT_PUBLIC_API_ENABLED',
};

function readEnvFlag(feature: string): boolean | undefined {
  const envKey = `FEATURE_${feature.toUpperCase().replace(/-/g, '_')}`;
  if (process.env[envKey] === 'true') return true;
  if (process.env[envKey] === 'false') return false;

  const alias = FEATURE_ENV_ALIASES[feature];
  if (alias) {
    if (process.env[alias] === 'true') return true;
    if (process.env[alias] === 'false') return false;
  }
  return undefined;
}

export async function isFeatureEnabled(tenantId: string, feature: string): Promise<boolean> {
  const fromEnv = readEnvFlag(feature);
  if (fromEnv !== undefined) return fromEnv;

  try {
    const row = await prisma.tenantFeature.findUnique({
      where: { tenantId_feature: { tenantId, feature } },
    });
    if (row) return row.enabled;
  } catch {
    // table may not exist yet during migration
  }
  return DEFAULT_FLAGS[feature] ?? false;
}

export function featureGate(feature: string) {
  return async (
    req: import('express').Request,
    res: import('express').Response,
    next: import('express').NextFunction
  ) => {
    const enabled = await isFeatureEnabled(req.tenantId ?? 'tenant_default', feature);
    if (!enabled) {
      const code = FEATURE_DISABLED_CODES[feature];
      if (code) {
        res.status(403).json({
          error: {
            code,
            message: `Feature '${feature}' is disabled`,
          },
          status: 'gated',
        });
        return;
      }
      res.status(403).json({ error: `Feature '${feature}' is disabled`, status: 'gated' });
      return;
    }
    next();
  };
}
