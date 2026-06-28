import { describe, expect, it, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import NaturalLanguageBar from '../NaturalLanguageBar';
import { renderWithProviders } from '@/test/render';
import { createTestDataAdapter } from '@/test/createTestDataAdapter';
import { buildCommandResult } from '@/test/factories/command';
import { DEFAULT_MERCHANT_SETTINGS } from '@/lib/settings/merchantSettingsTypes';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/lib/config/env', () => ({
  env: { dataSource: 'mock' as const },
}));

vi.mock('@/lib/settings/MerchantSettingsContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/settings/MerchantSettingsContext')>();
  return {
    ...actual,
    useMerchantSettings: () => ({
      settings: DEFAULT_MERCHANT_SETTINGS,
      loading: false,
      error: null,
      reload: vi.fn(),
      updateSettings: vi.fn(),
      updateNotificationPrefs: vi.fn(),
    }),
  };
});

describe('NaturalLanguageBar integration', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    sessionStorage.clear();
  });

  it('submits command and shows success result card', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NaturalLanguageBar />, {
      withCommand: true,
      initialEntries: ['/suppliers'],
    });

    const input = screen.getByTestId('global-command-bar').querySelector('input')!;
    await user.type(input, 'Sync leveranciers');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('command-api-response')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('command-error-card')).not.toBeInTheDocument();
  });

  it('shows error card when command execution fails', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NaturalLanguageBar />, {
      withCommand: true,
      initialEntries: ['/suppliers'],
      adapter: createTestDataAdapter({ executeFails: true }),
    });

    const input = screen.getByTestId('global-command-bar').querySelector('input')!;
    await user.type(input, 'mislukt commando');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('command-error-card')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('command-api-response')).not.toBeInTheDocument();
  });

  it('retries command after failure when input is refilled', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const adapter = createTestDataAdapter({
      executeCommand: async (command) => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error('Command execution failed');
        }
        return buildCommandResult({
          originalCommand: command.trim(),
          result: `Uitgevoerd: ${command.trim()}`,
        });
      },
    });

    renderWithProviders(<NaturalLanguageBar />, {
      withCommand: true,
      initialEntries: ['/suppliers'],
      adapter,
    });

    const input = screen.getByTestId('global-command-bar').querySelector('input')!;
    await user.type(input, 'retry test');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('command-error-card')).toBeInTheDocument();
    });

    await user.type(input, 'retry test');
    await user.click(screen.getByRole('button', { name: /opnieuw proberen/i }));

    await waitFor(() => {
      expect(screen.getByTestId('command-api-response')).toBeInTheDocument();
    });
    expect(attempts).toBe(2);
  });

  it('navigates to approvals for APPROVE_CHANGES intent', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NaturalLanguageBar />, {
      withCommand: true,
      initialEntries: ['/suppliers'],
      adapter: createTestDataAdapter({
        executeCommand: async (command) =>
          buildCommandResult({
            originalCommand: command.trim(),
            parsedIntent: 'APPROVE_CHANGES',
            result: 'Goedkeuringen getoond',
          }),
      }),
    });

    const input = screen.getByTestId('global-command-bar').querySelector('input')!;
    await user.type(input, 'Toon goedkeuringen');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('command-api-response')).toBeInTheDocument();
    });
    expect(navigateMock).toHaveBeenCalledWith('/approvals');
  });
});
