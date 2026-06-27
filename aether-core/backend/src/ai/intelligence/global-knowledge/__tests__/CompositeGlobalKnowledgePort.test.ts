import { CompositeGlobalKnowledgePort } from '../CompositeGlobalKnowledgePort';
import { StaticGlobalKnowledgeCatalog } from '../StaticGlobalKnowledgeCatalog';
import type { GlobalKnowledgePort } from '../GlobalKnowledgePort';
import type { KnowledgePatch } from '../types';

describe('CompositeGlobalKnowledgePort', () => {
  it('merges static and hive patches with dedupe by id', async () => {
    const hive: GlobalKnowledgePort = {
      getCatalogVersion: () => 'hive-1',
      listPatches: async () => [
        {
          id: 'hive:pricing:conversion_rate',
          version: 'hive-1',
          kind: 'metric_insight',
          category: 'pricing',
          title: 'Hive metric',
          content: 'avg conversion_rate=0.8',
          priority: 8,
          minProfile: 'conservative',
        },
        {
          id: 'pricing-margin-floor',
          version: '1.0.0',
          kind: 'pattern',
          category: 'pricing',
          title: 'Duplicate override',
          content: 'Should be overridden by static id dedupe last-wins from hive order',
          priority: 1,
          minProfile: 'conservative',
        },
      ],
    };

    const composite = new CompositeGlobalKnowledgePort([
      new StaticGlobalKnowledgeCatalog(),
      hive,
    ]);
    const patches = await composite.listPatches('tenant_test');

    expect(patches.some((p) => p.id === 'hive:pricing:conversion_rate')).toBe(true);
    expect(patches.some((p) => p.id === 'pricing-margin-floor')).toBe(true);
    const marginPatch = patches.find((p) => p.id === 'pricing-margin-floor');
    expect(marginPatch?.title).not.toBe('Duplicate override');
    expect(composite.getCatalogVersion()).toContain('1.0.0');
  });
});
