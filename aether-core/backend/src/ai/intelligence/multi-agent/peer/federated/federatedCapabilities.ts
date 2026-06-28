/** Static capability catalog for federated deployment registry (v1). */
export const FEDERATED_CAPABILITY_CATALOG = [
  'inventory-trends',
  'pricing-patterns',
  '*',
] as const;

export type FederatedCapability = (typeof FEDERATED_CAPABILITY_CATALOG)[number];
