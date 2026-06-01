import { prisma } from '../prisma/client';

const DEFAULT_FLAGS: Record<string, boolean> = {
  predictive: false,
  'self-evolving': false,
  physical: false,
  'co-ownership': false,
  agentic: true,
};

export async function isFeatureEnabled(tenantId: string, feature: string): Promise<boolean> {
  const envKey = `FEATURE_${feature.toUpperCase().replace(/-/g, '_')}`;
  if (process.env[envKey] === 'true') return true;
  if (process.env[envKey] === 'false') return false;

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
  return async (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    const enabled = await isFeatureEnabled(req.tenantId ?? 'tenant_default', feature);
    if (!enabled) {
      res.status(403).json({ error: `Feature '${feature}' is disabled`, status: 'gated' });
      return;
    }
    next();
  };
}
