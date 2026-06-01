import { prisma } from '../prisma/client';
import { loadFeatureStatusDocument, FeatureEntry } from '../truth/featureStatusRegistry';

const FEATURE_KEY_MAP: Record<string, string> = {
  'predictive-commerce': 'predictive',
  'self-evolving': 'self-evolving',
  'physical-digital': 'physical',
  'co-ownership': 'co-ownership',
  'agentic-commerce': 'agentic',
};

export async function applyKillFastPolicy(tenantId: string): Promise<string[]> {
  const doc = loadFeatureStatusDocument();
  const since30d = new Date(Date.now() - 30 * 86400000);
  const billable = await prisma.outcomeRecord.count({
    where: { tenantId, verificationStatus: 'billable', createdAt: { gte: since30d } },
  });

  const disabled: string[] = [];
  for (const [key, entry] of Object.entries(doc.features) as [string, FeatureEntry][]) {
    if (entry.status !== 'experimental') continue;
    const feature = FEATURE_KEY_MAP[key] ?? key;
    if (billable > 0) continue;

    await prisma.tenantFeature.upsert({
      where: { tenantId_feature: { tenantId, feature } },
      update: { enabled: false },
      create: { tenantId, feature, enabled: false },
    });
    disabled.push(key);
  }
  return disabled;
}
