import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CustomersPage from '@/pages/CustomersPage';
import { renderWithProviders } from '@/test/render';

const listCustomers = vi.fn();

vi.mock('@/features/commerce/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/commerce/api')>(
    '@/features/commerce/api',
  );
  return {
    ...actual,
    commerceApi: {
      ...actual.commerceApi,
      listCustomers: (...args: unknown[]) => listCustomers(...args),
    },
  };
});

vi.mock('@/lib/useFeatureStatus', () => ({
  useFeatureStatus: () => 'partial' as const,
  invalidateTruthStatusCache: vi.fn(),
}));

describe('CustomersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCustomers.mockResolvedValue([
      {
        id: 'cust_1',
        email: 'ada@example.com',
        name: 'Ada L',
        segment: 'vip',
        orderCount: 3,
        totalSpent: 240,
        lastOrderAt: '2026-07-01T00:00:00.000Z',
      },
    ]);
  });

  it('renders customer list from mocked API', async () => {
    renderWithProviders(<CustomersPage />, {
      initialEntries: ['/customers'],
      withCommand: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('customers-page')).toBeInTheDocument();
    });
    expect(await screen.findByText('Ada L')).toBeInTheDocument();
    expect(listCustomers).toHaveBeenCalled();
  });
});
