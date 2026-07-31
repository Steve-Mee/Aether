import type { SubmitInsightUseCase } from '../../modules/zero-knowledge-hive-mind/application/use-cases/SubmitInsightUseCase';
import type { QueryInsightsUseCase } from '../../modules/zero-knowledge-hive-mind/application/use-cases/QueryInsightsUseCase';
import type { PrivacyBudgetService } from '../../modules/zero-knowledge-hive-mind/application/services/HiveMindServices';
import type { AdminDataPort } from '../../modules/admin-command-bar/application/ports/AdminDataPort';
import type { SupplierMonitorPort } from '../../modules/admin-command-bar/application/ports/SupplierMonitorPort';
import type { DynamicPricingEngine } from '../../modules/inventory-pricing/application/services/DynamicPricingEngine';
import type { DecisionRepository } from '../../modules/autonomous-operations/domain/repositories/DecisionRepository';
import type { EmbeddingPort } from './vector-store/EmbeddingPort';
import { createProductionEmbedding } from './vector-store/ResilientEmbeddingAdapter';
import { FilesystemLoRAAdapter } from './personal-brain/FilesystemLoRAAdapter';
import { InMemoryLoRAAdapter } from './personal-brain/InMemoryLoRAAdapter';
import type { LoRAAdapterRegistryPort } from './personal-brain/LoRAAdapterRegistryPort';
import type { AgentStatePort } from './personal-brain/AgentStatePort';
import {
  InMemoryAgentStateAdapter,
  PrismaAgentStateAdapter,
} from './personal-brain/PrismaAgentStateAdapter';
import { HiveMindKnowledgeTransferAdapter } from './knowledge-transfer/HiveMindKnowledgeTransferAdapter';
import type { KnowledgeTransferPort } from './knowledge-transfer/KnowledgeTransferPort';
import { KnowledgeTransferService } from './knowledge-transfer/KnowledgeTransferService';
import { HiveMindGlobalBrain } from './global-brain/HiveMindGlobalBrain';
import type { GlobalBrainPort } from './global-brain/GlobalBrainPort';
import { PlaceholderGlobalBrain } from './global-brain/PlaceholderGlobalBrain';
import { LoRAPatchAdapter } from './global-knowledge/adapters/LoRAPatchAdapter';
import { VectorDistillationAdapter } from './global-knowledge/adapters/VectorDistillationAdapter';
import { CompositeGlobalKnowledgePort } from './global-knowledge/CompositeGlobalKnowledgePort';
import type { GlobalKnowledgePort } from './global-knowledge/GlobalKnowledgePort';
import { PrismaGlobalKnowledgeCatalog } from './global-knowledge/PrismaGlobalKnowledgeCatalog';
import { StaticGlobalKnowledgeCatalog } from './global-knowledge/StaticGlobalKnowledgeCatalog';
import { FederatedGlobalKnowledgeAdapter } from './global-knowledge/federated/FederatedGlobalKnowledgeAdapter';
import { FederatedQueryUseCase } from './global-knowledge/federated/FederatedQueryUseCase';
import { HiveMindGlobalKnowledgeAdapter } from './global-knowledge/HiveMindGlobalKnowledgeAdapter';
import { logger } from '../../shared/logging/logger';

export interface IntelligenceLayerDeps {
  submitInsight?: SubmitInsightUseCase;
  queryInsights?: QueryInsightsUseCase;
  privacyBudgetService?: PrivacyBudgetService;
  adminData?: AdminDataPort;
  supplierMonitor?: SupplierMonitorPort;
  dynamicPricingEngine?: DynamicPricingEngine;
  decisionRepository?: DecisionRepository;
}

export function resolveEmbedding(): EmbeddingPort {
  return createProductionEmbedding();
}

export function resolveLoRARegistry(): LoRAAdapterRegistryPort {
  if (process.env.INTELLIGENCE_VECTOR_BACKEND === 'memory') {
    return new InMemoryLoRAAdapter();
  }
  return new FilesystemLoRAAdapter();
}

export function resolveAgentState(): AgentStatePort {
  if (process.env.INTELLIGENCE_VECTOR_BACKEND === 'memory') {
    return new InMemoryAgentStateAdapter();
  }
  return new PrismaAgentStateAdapter();
}

export function resolveKnowledgeTransfer(deps?: IntelligenceLayerDeps): KnowledgeTransferPort {
  if (deps?.submitInsight && deps?.queryInsights) {
    return new HiveMindKnowledgeTransferAdapter(deps.submitInsight, deps.queryInsights);
  }
  return new KnowledgeTransferService();
}

export function resolveGlobalBrain(deps?: IntelligenceLayerDeps): GlobalBrainPort {
  if (deps?.queryInsights) {
    return new HiveMindGlobalBrain(deps.queryInsights);
  }
  return new PlaceholderGlobalBrain();
}

export function resolveGlobalKnowledgePort(deps?: IntelligenceLayerDeps) {
  const sources: GlobalKnowledgePort[] = [
    new PrismaGlobalKnowledgeCatalog(),
    new StaticGlobalKnowledgeCatalog(),
  ];

  if (deps?.privacyBudgetService) {
    sources.push(new FederatedGlobalKnowledgeAdapter(new FederatedQueryUseCase(deps.privacyBudgetService)));
  }

  if (deps?.queryInsights) {
    sources.push(new HiveMindGlobalKnowledgeAdapter(deps.queryInsights));
  }

  sources.push(new LoRAPatchAdapter(), new VectorDistillationAdapter());

  return new CompositeGlobalKnowledgePort(sources);
}

export function logEmbeddingBackend(embedding: EmbeddingPort): void {
  const backend =
    process.env.INTELLIGENCE_EMBEDDING === 'ollama' ? 'ollama (resilient)' : 'hash (default)';
  logger.info('intelligence_embedding_backend', { backend, model: embedding.constructor.name });
}
