import { InMemoryAgentStateAdapter } from '../../personal-brain/PrismaAgentStateAdapter';
import { InMemoryLoRAAdapter } from '../../personal-brain/InMemoryLoRAAdapter';
import { PersonalBrainRegistry } from '../../personal-brain/PersonalBrainRegistry';
import { SimpleHashEmbeddingAdapter } from '../../vector-store/SimpleHashEmbeddingAdapter';
import { InMemoryVectorStoreAdapter } from '../../vector-store/adapters/InMemoryVectorStoreAdapter';
import { GlobalKnowledgeService } from '../GlobalKnowledgeService';
import { StaticGlobalKnowledgeCatalog } from '../StaticGlobalKnowledgeCatalog';
import type { MerchantSettings } from '../../../../shared/settings/merchantSettingsTypes';

const balancedSettings: MerchantSettings = {
  autonomyLevel: 'medium',
  autoApproveLowRisk: true,
  autoApproveMediumRiskMail: false,
  maxAutoPriceChangePct: 5,
  maxMarginImpactEuro: 500,
  policyEnabled: true,
  autoRunWindow: 'always',
  autoRunWindowStart: '18:00',
  autoRunWindowEnd: '08:00',
  notificationPrefs: {
    autonomousLowRisk: { inApp: true, email: false },
    highRiskApproval: { inApp: true, email: true },
    supplierChanges: { inApp: true, email: false },
    weeklyDigest: { inApp: true, email: true },
    frequency: 'immediate',
  },
  locale: 'nl',
  dataExportEnabled: true,
  brainVectorBackend: null,
  brainKnowledgeTransferEnabled: null,
  brainKnowledgeUpdateProfile: 'balanced',
  brainFederatedContributionEnabled: false,
  brainKnowledgeGovernanceMode: 'full_loop',
  brainLoRAPath: null,
  brainActionMode: 'confirm_on_uncertain',
  brainAdaptiveLearningEnabled: false,
  brainAdaptiveAutoExecuteEnabled: false,
};

function createTestRegistry(): PersonalBrainRegistry {
  return new PersonalBrainRegistry(
    new InMemoryVectorStoreAdapter(),
    new SimpleHashEmbeddingAdapter(),
    new InMemoryLoRAAdapter(),
    new InMemoryAgentStateAdapter()
  );
}

describe('GlobalKnowledgeService', () => {
  const tenantId = 'tenant_gk';

  beforeEach(() => {
    process.env.INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED = 'true';
  });

  afterEach(() => {
    delete process.env.INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED;
  });

  it('returns empty when KT gate is disabled', async () => {
    const registry = createTestRegistry();
    const gate = { isEnabled: jest.fn().mockResolvedValue(false) };
    const service = new GlobalKnowledgeService(
      new StaticGlobalKnowledgeCatalog(),
      registry,
      gate,
      async () => balancedSettings
    );

    const result = await service.syncForTenant(tenantId);
    expect(result.applied).toBe(0);
    expect(result.patches).toHaveLength(0);
  });

  it('applies filtered patches to PersonalBrain vector store', async () => {
    const registry = createTestRegistry();
    const gate = {
      isEnabled: jest.fn().mockResolvedValue(true),
    };
    const service = new GlobalKnowledgeService(
      new StaticGlobalKnowledgeCatalog(),
      registry,
      gate,
      async () => balancedSettings
    );

    const result = await service.syncForTenant(tenantId);
    expect(result.applied).toBeGreaterThan(0);
    expect(result.synced).toBe(true);

    const recall = await registry.get(tenantId, 'admin').recall('pricing margin', 10);
    expect(recall.snippets.some((s) => s.includes('[GLOBAL_KNOWLEDGE:'))).toBe(true);

    const second = await service.syncForTenant(tenantId);
    expect(second.synced).toBe(false);
    expect(second.skipped).toBeGreaterThan(0);
  });

  it('respects conservative profile filtering', async () => {
    const registry = createTestRegistry();
    const gate = { isEnabled: jest.fn().mockResolvedValue(true) };
    const service = new GlobalKnowledgeService(
      new StaticGlobalKnowledgeCatalog(),
      registry,
      gate,
      async () => ({ ...balancedSettings, brainKnowledgeUpdateProfile: 'conservative' })
    );

    const result = await service.syncForTenant(`${tenantId}_conservative`);
    expect(result.patches.every((p) => p.kind !== 'prompt_template')).toBe(true);
  });

  it('builds user-facing context meta when patches applied', () => {
    const registry = createTestRegistry();
    const service = new GlobalKnowledgeService(
      new StaticGlobalKnowledgeCatalog(),
      registry,
      { isEnabled: async () => true },
      async () => balancedSettings
    );

    const meta = service.buildContextMeta({
      applied: 3,
      skipped: 0,
      retired: 0,
      catalogVersion: '1.0.0',
      patches: [],
      synced: true,
    });

    expect(meta?.message).toContain('3 algemene patronen');
  });
});
