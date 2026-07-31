import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import PromotionsPage from '@/pages/PromotionsPage';
import { renderWithProviders } from '@/test/render';

const listPromotions = vi.fn();

vi.mock('@/features/commerce/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/commerce/api')>(
    '@/features/commerce/api',
  );
  return {
    ...actual,
    commerceApi: {
      ...actual.commerceApi,
      listPromotions: (...args: unknown[]) => listPromotions(...args),
    },
  };
});

vi.mock('@/lib/useFeatureStatus', () => ({
  useFeatureStatus: () => 'partial' as const,
  invalidateTruthStatusCache: vi.fn(),
}));

describe('PromotionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPromotions.mockResolvedValue([
      {
        id: 'promo_1',
        tenantId: 'tenant_a',
        name: 'Summer sale',
        type: 'percent',
        value: 10,
        status: 'draft',
      },
    ]);
  });

  it('renders promotions list from mocked API', async () => {
    renderWithProviders(<PromotionsPage />, {
      initialEntries: ['/promotions'],
      withCommand: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('promotions-page')).toBeInTheDocument();
    });
    expect(await screen.findByText('Summer sale')).toBeInTheDocument();
    expect(listPromotions).toHaveBeenCalled();
  });

  it('shows empty state when API returns no promotions', async () => {
    listPromotions.mockResolvedValue([]);
    renderWithProviders(<PromotionsPage />, {
      initialEntries: ['/promotions'],
      withCommand: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('promotions-page')).toBeInTheDocument();
    });
    expect(await screen.findByText(/Nog geen promoties|No promotions yet/i)).toBeInTheDocument();
  });
});
