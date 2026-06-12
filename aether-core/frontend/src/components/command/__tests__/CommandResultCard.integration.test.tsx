import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import CommandResultCard from '../CommandResultCard';
import { renderWithProviders } from '@/test/render';
import { buildCommandResult, buildFailedCommandResult } from '@/test/factories/command';

describe('CommandResultCard integration', () => {
  it('renders success result with undo button when undoable', () => {
    renderWithProviders(
      <CommandResultCard
        result={buildCommandResult({ undoable: true, parsedIntent: 'APPROVE_CHANGES' })}
        onUndo={vi.fn()}
      />,
    );

    expect(screen.getByTestId('command-api-response')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ongedaan maken/i })).toBeInTheDocument();
  });

  it('calls onUndo when undo button is clicked', async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    renderWithProviders(
      <CommandResultCard result={buildCommandResult({ undoable: true })} onUndo={onUndo} />,
    );

    await user.click(screen.getByRole('button', { name: /ongedaan maken/i }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('renders error state with retry for ERROR intent', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderWithProviders(
      <CommandResultCard
        result={buildFailedCommandResult({ result: 'API timeout' })}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByTestId('command-api-response')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /opnieuw proberen/i });
    await user.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides undo button when result is not undoable', () => {
    renderWithProviders(
      <CommandResultCard result={buildCommandResult({ undoable: false })} onUndo={vi.fn()} />,
    );

    expect(screen.queryByRole('button', { name: /ongedaan maken/i })).not.toBeInTheDocument();
  });
});
