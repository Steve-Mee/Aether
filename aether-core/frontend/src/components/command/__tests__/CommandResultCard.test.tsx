import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { createElement } from 'react';
import CommandResultCard from '../CommandResultCard';
import type { CommandResult } from '@/types/command';
import { createCriticalFlowWrapper } from '@/test/render';
import { render } from '@testing-library/react';

describe('CommandResultCard agent indicator', () => {
  it('shows pricing agent badge when specialist metadata present', () => {
    const { Wrapper } = createCriticalFlowWrapper();
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

    render(createElement(CommandResultCard, { result }), { wrapper: Wrapper });
    expect(screen.getAllByText('Pricing Agent').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Gedelegueerd van/)).toBeInTheDocument();
  });

  it('shows explain details button when commandId is present', () => {
    const { Wrapper } = createCriticalFlowWrapper();
    const result: CommandResult = {
      success: true,
      result: 'Done',
      parsedIntent: 'INVENTORY_STATUS',
      confidence: 0.9,
      commandId: 'cmd-123',
      brain: { contextSnippets: [] },
    };

    render(createElement(CommandResultCard, { result }), { wrapper: Wrapper });
    expect(screen.getByTestId('command-explain-button')).toBeInTheDocument();
  });
});
