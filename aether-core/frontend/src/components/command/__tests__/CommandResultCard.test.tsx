import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import CommandResultCard from '../CommandResultCard';
import type { CommandResult } from '@/types/command';
import { renderWithProviders } from '@/test/render';

describe('CommandResultCard agent indicator', () => {
  it('shows pricing agent badge when specialist metadata present', () => {
    const result: CommandResult = {
      success: true,
      result: 'Marge-analyse afgerond',
      parsedIntent: 'LOW_MARGIN_REPORT',
      confidence: 0.9,
      brain: {
        contextSnippets: [],
        specialist: {
          agentKey: 'pricing',
          delegatedFrom: 'admin',
          specialistRunId: 'run-1',
          routingSource: 'intent',
        },
      },
    };

    renderWithProviders(<CommandResultCard result={result} />);
    expect(screen.getAllByText('Pricing Agent').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Gedelegueerd van/)).toBeInTheDocument();
  });
});
