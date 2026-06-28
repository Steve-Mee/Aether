import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProactiveSuggestionCard from '../ProactiveSuggestionCard';

vi.mock('@/lib/i18n', () => ({
  t: (key: string) => key,
}));

const baseSuggestion = {
  id: 'proactive-test-1',
  title: 'Test proactive suggestion',
  impactHint: '+€500',
  category: 'prijs' as const,
  executionMode: 'approval_required' as const,
  hasExplainability: true,
};

describe('ProactiveSuggestionCard', () => {
  it('renders title and triggers execute action', async () => {
    const user = userEvent.setup();
    const onExecute = vi.fn();

    render(
      <ProactiveSuggestionCard
        suggestion={baseSuggestion}
        onExecute={onExecute}
        onDismiss={vi.fn()}
        onSnooze={vi.fn()}
      />,
    );

    expect(screen.getByText('Test proactive suggestion')).toBeInTheDocument();
    expect(screen.getByText('+€500')).toBeInTheDocument();

    await user.click(screen.getByTestId('proactive-execute-proactive-test-1'));
    expect(onExecute).toHaveBeenCalledOnce();
  });

  it('shows highlighted ring when highlighted', () => {
    const { container } = render(
      <ProactiveSuggestionCard
        suggestion={baseSuggestion}
        highlighted
        onExecute={vi.fn()}
        onDismiss={vi.fn()}
        onSnooze={vi.fn()}
      />,
    );

    expect(container.querySelector('[data-testid="proactive-suggestion-proactive-test-1"]')).toHaveClass(
      'ring-2',
    );
  });
});
