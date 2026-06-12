import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test render crash');
  }
  return <p>Content OK</p>;
}

describe('ErrorBoundary', () => {
  // Suppress React error boundary console noise in tests
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary name="test">
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Content OK')).toBeInTheDocument();
  });

  it('shows fallback UI when child throws', () => {
    render(
      <ErrorBoundary name="module">
        <ThrowingChild shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Content OK')).not.toBeInTheDocument();
  });

  it('calls onGoHome when home button is clicked', async () => {
    const user = userEvent.setup();
    const onGoHome = vi.fn();

    render(
      <ErrorBoundary name="module" onGoHome={onGoHome}>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>,
    );

    await user.click(screen.getByRole('button', { name: /naar command center/i }));
    expect(onGoHome).toHaveBeenCalledTimes(1);
  });

  it('recovers when retry is clicked after error', async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    function ToggleChild() {
      if (shouldThrow) throw new Error('Transient crash');
      return <p>Recovered</p>;
    }

    const { rerender } = render(
      <ErrorBoundary name="module">
        <ToggleChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();

    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /opnieuw proberen/i }));
    rerender(
      <ErrorBoundary name="module">
        <ToggleChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });

  consoleError.mockRestore();
});
