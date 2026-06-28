import type { BrainToolExecutor, PersonalBrainToolRegistryDeps } from './types';
import {
  getCollectiveInsightsTool,
  getPendingApprovalsTool,
  getProductInfoTool,
  recallMemoryTool,
  searchProductsTool,
} from './readTools';
import {
  createApprovalTool,
  createInsightTool,
  syncSupplierTool,
  updatePriceTool,
} from './proposeTools';

export function createDefaultBrainTools(deps: PersonalBrainToolRegistryDeps): BrainToolExecutor[] {
  return [
    bindDeps(searchProductsTool, deps),
    bindDeps(recallMemoryTool, deps),
    bindDeps(getCollectiveInsightsTool, deps),
    bindDeps(getProductInfoTool, deps),
    bindDeps(getPendingApprovalsTool, deps),
    bindDeps(updatePriceTool, deps),
    bindDeps(syncSupplierTool, deps),
    bindDeps(createApprovalTool, deps),
    bindDeps(createInsightTool, deps),
  ];
}

function bindDeps(
  factory: (deps: PersonalBrainToolRegistryDeps) => BrainToolExecutor,
  deps: PersonalBrainToolRegistryDeps
): BrainToolExecutor {
  return factory(deps);
}
