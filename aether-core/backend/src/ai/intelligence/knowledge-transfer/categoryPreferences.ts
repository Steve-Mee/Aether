import { prisma } from '../../../shared/prisma/client';
import type { ContributionCategory } from './contribution/contributionTaxonomy';
import { ALLOWED_CONTRIBUTION_CATEGORIES } from './contribution/contributionTaxonomy';

export interface CategoryPreferences {
  pricing?: boolean;
  conversion?: boolean;
  trend?: boolean;
  inventory?: boolean;
  marketing?: boolean;
}

export function isKnowledgeTransferEnabledEnv(): boolean {
  return process.env.INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED === 'true';
}

/** Env default, with optional per-tenant opt-out via TenantSettings. */
export async function isKnowledgeTransferEnabledForTenant(tenantId: string): Promise<boolean> {
  if (!isKnowledgeTransferEnabledEnv()) return false;
  const row = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { brainKnowledgeTransferEnabled: true },
  });
  if (row?.brainKnowledgeTransferEnabled === false) return false;
  return true;
}

/**
 * Check if knowledge transfer is enabled for a specific category.
 * Returns false if:
 * - KT is disabled globally (env)
 * - KT is disabled for tenant (brainKnowledgeTransferEnabled)
 * - Category is explicitly opted out in brainKnowledgeTransferCategories
 */
export async function isKnowledgeTransferEnabledForCategory(
  tenantId: string,
  category: ContributionCategory
): Promise<boolean> {
  if (!isKnowledgeTransferEnabledEnv()) return false;
  if (!ALLOWED_CONTRIBUTION_CATEGORIES.has(category)) return false;

  const row = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: {
      brainKnowledgeTransferEnabled: true,
      proactivePrefs: true,
    },
  });

  if (row?.brainKnowledgeTransferEnabled === false) return false;

  const prefs = parseCategoryPreferences(row?.proactivePrefs);
  if (prefs[category] === false) return false;

  return true;
}

/**
 * Get category preferences for a tenant.
 * Returns object with boolean values for each category.
 * Defaults to true (enabled) for categories not explicitly set.
 */
export async function getCategoryPreferences(
  tenantId: string
): Promise<CategoryPreferences> {
  const row = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { proactivePrefs: true },
  });

  return parseCategoryPreferences(row?.proactivePrefs);
}

/**
 * Update category preferences for a tenant.
 * Only updates specified categories, leaves others unchanged.
 */
export async function updateCategoryPreferences(
  tenantId: string,
  updates: Partial<CategoryPreferences>
): Promise<void> {
  const current = await getCategoryPreferences(tenantId);
  const merged = { ...current, ...updates };

  const row = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { proactivePrefs: true },
  });

  const existingPrefs =
    row?.proactivePrefs && typeof row.proactivePrefs === 'object'
      ? (row.proactivePrefs as Record<string, unknown>)
      : {};

  const updatedPrefs = {
    ...existingPrefs,
    knowledgeTransferCategories: merged,
  };

  await prisma.tenantSettings.upsert({
    where: { tenantId },
    create: {
      tenantId,
      proactivePrefs: updatedPrefs,
    },
    update: {
      proactivePrefs: updatedPrefs,
    },
  });
}

function parseCategoryPreferences(prefs: unknown): CategoryPreferences {
  if (!prefs || typeof prefs !== 'object') {
    return getDefaultPreferences();
  }

  const obj = prefs as Record<string, unknown>;
  const ktCategories = obj.knowledgeTransferCategories;

  if (!ktCategories || typeof ktCategories !== 'object') {
    return getDefaultPreferences();
  }

  const categories = ktCategories as Record<string, unknown>;
  const result: CategoryPreferences = {};

  for (const category of ALLOWED_CONTRIBUTION_CATEGORIES) {
    result[category as keyof CategoryPreferences] = categories[category] !== false;
  }

  return result;
}

function getDefaultPreferences(): CategoryPreferences {
  return {
    pricing: true,
    conversion: true,
    trend: true,
    inventory: true,
    marketing: true,
  };
}
