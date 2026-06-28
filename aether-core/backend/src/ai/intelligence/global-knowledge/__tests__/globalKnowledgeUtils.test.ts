import { filterPatchesByProfile, formatGlobalPatchSnippet } from '../globalKnowledgeUtils';
import type { KnowledgePatch } from '../types';

const basePatch = (overrides: Partial<KnowledgePatch>): KnowledgePatch => ({
  id: 'test-patch',
  version: '1.0.0',
  kind: 'pattern',
  category: 'pricing',
  title: 'Test',
  content: 'Test content',
  priority: 7,
  minProfile: 'balanced',
  ...overrides,
});

describe('filterPatchesByProfile', () => {
  const patches: KnowledgePatch[] = [
    basePatch({ id: 'high-pattern', kind: 'pattern', priority: 9, minProfile: 'conservative' }),
    basePatch({ id: 'low-pattern', kind: 'pattern', priority: 5, minProfile: 'balanced' }),
    basePatch({ id: 'prompt', kind: 'prompt_template', priority: 8, minProfile: 'aggressive' }),
    basePatch({ id: 'rule', kind: 'optimization_rule', priority: 6, minProfile: 'balanced' }),
    basePatch({ id: 'metric', kind: 'metric_insight', priority: 8, minProfile: 'conservative' }),
  ];

  it('conservative keeps high-priority patterns and metric insights only', () => {
    const filtered = filterPatchesByProfile(patches, 'conservative');
    expect(filtered.map((p) => p.id)).toEqual(['high-pattern', 'metric']);
  });

  it('balanced excludes low-priority prompt templates', () => {
    const filtered = filterPatchesByProfile(patches, 'balanced');
    expect(filtered.map((p) => p.id)).not.toContain('prompt');
    expect(filtered.map((p) => p.id)).toContain('low-pattern');
  });

  it('aggressive includes all patches', () => {
    const filtered = filterPatchesByProfile(patches, 'aggressive');
    expect(filtered).toHaveLength(patches.length);
  });
});

describe('formatGlobalPatchSnippet', () => {
  it('labels global knowledge distinctly', () => {
    const snippet = formatGlobalPatchSnippet(
      basePatch({ kind: 'pattern', title: 'Margin floor', content: 'Keep 15% margin' })
    );
    expect(snippet).toContain('[global:pattern]');
    expect(snippet).toContain('Margin floor');
  });
});
