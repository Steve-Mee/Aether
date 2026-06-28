import type { PersonalBrainRegistry } from '../../../ai/intelligence/personal-brain/PersonalBrainRegistry';

export class BilateralImportAdapter {
  constructor(private personalBrainRegistry: PersonalBrainRegistry) {}

  async ingest(
    consumerTenantId: string,
    contractId: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const brain = this.personalBrainRegistry.get(consumerTenantId);
    const content = Object.entries(payload)
      .map(([k, v]) => `${k}=${String(v)}`)
      .join('; ');
    await brain.indexKnowledge({
      id: `bilateral:${contractId}:${Date.now()}`,
      content: `Bilateral exchange insight: ${content}`,
      metadata: {
        source: `bilateral:${contractId}`,
        contractId,
        type: 'bilateral_aggregate',
      },
    });
  }
}
