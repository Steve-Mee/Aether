import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExplainabilityDiffPanel from '../ExplainabilityDiffPanel';
import type { ExplainabilityDiff } from '@/types/explainability';

const fixture: ExplainabilityDiff = {
  left: { sourceType: 'command', sourceId: 'a', summary: 'Oud' },
  right: { sourceType: 'command', sourceId: 'b', summary: 'Nieuw' },
  summaryChanged: true,
  agents: { added: ['pricing'], removed: [], unchanged: ['inventory'] },
  triggerIdChanged: false,
  intentIdChanged: false,
  dataSourcesAdded: ['Prijslijst'],
  dataSourcesRemoved: [],
  reasoningAdded: [],
  reasoningRemoved: [],
  narrativeHints: ['Deze keer ook betrokken: pricing'],
};

describe('ExplainabilityDiffPanel', () => {
  it('renders diff hints and agent changes', () => {
    render(<ExplainabilityDiffPanel diff={fixture} onClose={() => {}} />);

    expect(screen.getByTestId('explain-diff-panel')).toBeInTheDocument();
    expect(screen.getAllByText(/pricing/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Prijslijst/)).toBeInTheDocument();
  });
});
