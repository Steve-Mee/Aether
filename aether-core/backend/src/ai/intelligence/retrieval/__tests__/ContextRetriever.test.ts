import { ContextRetriever } from '../ContextRetriever';
import { InMemoryAgentStateAdapter } from '../../personal-brain/PrismaAgentStateAdapter';
import { InMemoryLoRAAdapter } from '../../personal-brain/InMemoryLoRAAdapter';
import { PersonalBrainRegistry } from '../../personal-brain/PersonalBrainRegistry';
import { SimpleHashEmbeddingAdapter } from '../../vector-store/SimpleHashEmbeddingAdapter';
import { InMemoryVectorStoreAdapter } from '../../vector-store/adapters/InMemoryVectorStoreAdapter';
import { GlobalKnowledgeService } from '../../global-knowledge/GlobalKnowledgeService';
import { StaticGlobalKnowledgeCatalog } from '../../global-knowledge/StaticGlobalKnowledgeCatalog';
import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import type { MerchantSettings } from '../../../../shared/settings/merchantSettingsTypes';

const adminData = {
  countProducts: async () => 0,
  countLowMarginProducts: async () => 0,
  updateProductPrices: async () => 0,
  listInventoryItems: async () => [],
  listRecentOrders: async () => [],
  countEmailsByStatus: async () => 0,
  countOutcomesByStatus: async () => 0,
  countForecasts: async () => 0,
  countPendingApprovals: async () => 0,
  listPendingApprovals: async () => [],
  approveLowRisk: async () => 0,
  createSupplier: async () => ({ id: 's1', name: 'Supplier' }),
  listSuppliers: async () => [],
  findLatestProposedOutcome: async () => null,
  countRecentCommands: async () => 0,
  listLowStockInventory: async () => [],
  listProductsForBrain: async () => [],
  searchProductsByName: async () => [],
  updateProductPricesByIds: async () => 0,
  restoreProductPrices: async () => 0,
} satisfies AdminDataPort;

const settings: MerchantSettings = {
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
  brainLoRAPath: null,
  brainActionMode: 'confirm_on_uncertain',
  brainAdaptiveLearningEnabled: false,
  brainAdaptiveAutoExecuteEnabled: false,
};

describe('ContextRetriever global knowledge', () => {
  it('includes global chunks when service has active patches', async () => {
    const registry = new PersonalBrainRegistry(
      new InMemoryVectorStoreAdapter(),
      new SimpleHashEmbeddingAdapter(),
      new InMemoryLoRAAdapter(),
      new InMemoryAgentStateAdapter()
    );
    const globalKnowledgeService = new GlobalKnowledgeService(
      new StaticGlobalKnowledgeCatalog(),
      registry,
      { isEnabled: async () => true },
      async () => settings
    );
    await globalKnowledgeService.syncForTenant('tenant_retrieval');

    const retriever = new ContextRetriever(registry, adminData, globalKnowledgeService);
    const chunks = await retriever.retrieve({
      tenantId: 'tenant_retrieval',
      query: 'pricing margin',
    });

    expect(chunks.some((c) => c.source === 'global')).toBe(true);
  });
});
