import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppErrorShell } from '../AppErrorShell';

function ThrowingChild(): never {
  throw new Error('App root crash');
}

describe('AppErrorShell integration', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  it('opens critical error dialog when child throws', async () => {
    render(
      <MemoryRouter initialEntries={['/suppliers']}>
        <AppErrorShell>
          <ThrowingChild />
        </AppErrorShell>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('closes critical dialog when dismiss action is taken', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/suppliers']}>
        <AppErrorShell>
          <ThrowingChild />
        </AppErrorShell>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  consoleError.mockRestore();
});
