import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import AgentExplainabilitySheet from '../AgentExplainabilitySheet';
import { createCriticalFlowWrapper } from '@/test/render';
import { render } from '@testing-library/react';

describe('AgentExplainabilitySheet', () => {
  it('loads and renders explainability sections from mock API', async () => {
    const { Wrapper } = createCriticalFlowWrapper();

    render(
      createElement(AgentExplainabilitySheet, {
        entityType: 'proactive_suggestion',
        entityId: 'demo-suggestion-1',
        open: true,
        onClose: () => {},
        title: 'Low stock',
      }),
      { wrapper: Wrapper },
    );

    expect(await screen.findByText('Low stock')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText(/Voorraad-agent/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders email timeline events fallback', async () => {
    const { Wrapper } = createCriticalFlowWrapper();

    render(
      createElement(AgentExplainabilitySheet, {
        entityType: 'email',
        entityId: 'email-1',
        open: true,
        onClose: () => {},
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(screen.getByText(/Mock explain event|on tvangen/i)).toBeInTheDocument();
    });
  });
});
