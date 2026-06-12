import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import CommandErrorCard from '../CommandErrorCard';
import { renderWithProviders } from '@/test/render';

describe('CommandErrorCard integration', () => {
  it('renders error card with message', () => {
    renderWithProviders(<CommandErrorCard message="Command execution failed" />);

    expect(screen.getByTestId('command-error-card')).toBeInTheDocument();
    expect(screen.getByText('Command execution failed')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderWithProviders(<CommandErrorCard message="API timeout" onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: /opnieuw proberen/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides retry button when onRetry is not provided', () => {
    renderWithProviders(<CommandErrorCard message="Permanent failure" />);

    expect(screen.queryByRole('button', { name: /opnieuw proberen/i })).not.toBeInTheDocument();
  });
});
