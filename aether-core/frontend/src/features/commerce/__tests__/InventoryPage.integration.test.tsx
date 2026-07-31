import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import InventoryPage from '@/pages/InventoryPage';
import { renderWithProviders } from '@/test/render';

const listInventory = vi.fn();
const listLowStock = vi.fn();

vi.mock('@/features/commerce/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/commerce/api')>(
    '@/features/commerce/api',
  );
  return {
    ...actual,
    commerceApi: {
      ...actual.commerceApi,
      listInventory: (...args: unknown[]) => listInventory(...args),
      listLowStock: (...args: unknown[]) => listLowStock(...args),
    },
  };
});

vi.mock('@/lib/useFeatureStatus', () => ({
  useFeatureStatus: () => 'partial' as const,
  invalidateTruthStatusCache: vi.fn(),
}));

describe('InventoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listInventory.mockResolvedValue([
      {
        id: 'inv_1',
        productId: 'prod_a',
        warehouseId: 'default',
        quantity: 2,
        productName: 'Kom Aarde',
        productSlug: 'kom-aarde',
        threshold: 5,
        status: 'low',
      },
    ]);
    listLowStock.mockResolvedValue([{ id: 'inv_1', productId: 'prod_a', quantity: 2 }]);
  });

  it('renders inventory and low-stock banner', async () => {
    renderWithProviders(<InventoryPage />, {
      initialEntries: ['/inventory'],
      withCommand: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('inventory-page')).toBeInTheDocument();
    });
    expect(await screen.findByText('Kom Aarde')).toBeInTheDocument();
    expect(screen.getByTestId('inventory-low-stock-banner')).toBeInTheDocument();
  });
});
