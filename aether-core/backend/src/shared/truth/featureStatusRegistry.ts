import fs from 'fs';
import path from 'path';

export type FeatureStatus = 'live' | 'partial' | 'experimental' | 'planned' | 'scaffold';

export interface FeatureEntry {
  status: FeatureStatus;
  label: string;
}

export interface FeatureStatusDocument {
  version: string;
  updatedAt: string;
  claimPolicy: string;
  features: Record<string, FeatureEntry>;
  phases: Record<string, FeatureEntry>;
}

let cached: FeatureStatusDocument | null = null;

function resolveFeatureStatusPath(): string {
  const overridePath = process.env.FEATURE_STATUS_PATH;
  const candidates = [
    overridePath,
    path.resolve(__dirname, '../../../../docs/feature-status.json'),
    path.resolve(__dirname, '../../../../../docs/feature-status.json'),
    path.resolve(process.cwd(), 'docs/feature-status.json'),
    path.resolve(process.cwd(), '../docs/feature-status.json'),
    '/docs/feature-status.json',
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(
    `feature-status.json not found. Checked: ${candidates.join(', ')}`
  );
}

export function loadFeatureStatusDocument(): FeatureStatusDocument {
  if (cached) return cached;
  const filePath = resolveFeatureStatusPath();
  const raw = fs.readFileSync(filePath, 'utf8');
  cached = JSON.parse(raw) as FeatureStatusDocument;
  return cached;
}

export function getFeatureStatus(featureKey: string): FeatureStatus {
  const doc = loadFeatureStatusDocument();
  return doc.features[featureKey]?.status ?? 'planned';
}

export function getUiFeatureStatus(featureKey: string): 'live' | 'partial' | 'experimental' {
  const status = getFeatureStatus(featureKey);
  if (status === 'live') return 'live';
  if (status === 'experimental' || status === 'scaffold') return 'experimental';
  return 'partial';
}

export function getDashboardAggregateStatus(): 'live' | 'partial' | 'experimental' {
  const doc = loadFeatureStatusDocument();
  const statuses = Object.values(doc.features).map((f) => f.status);
  if (statuses.some((s) => s === 'partial' || s === 'scaffold')) return 'partial';
  if (statuses.some((s) => s === 'experimental')) return 'experimental';
  return 'live';
}
