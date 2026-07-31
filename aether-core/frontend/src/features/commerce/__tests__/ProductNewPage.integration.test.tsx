import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProductNewPage from '@/pages/ProductNewPage';
import { renderWithProviders } from '@/test/render';

vi.mock('@/lib/useFeatureStatus', () => ({
  useFeatureStatus: () => 'partial' as const,
  invalidateTruthStatusCache: vi.fn(),
}));

describe('ProductNewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create-product form fixtures', async () => {
    renderWithProviders(<ProductNewPage />, {
      initialEntries: ['/products/new'],
      withCommand: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('product-new-page')).toBeInTheDocument();
    });
    expect(screen.getByTestId('product-new-name')).toBeInTheDocument();
    expect(screen.getByTestId('product-new-slug')).toBeInTheDocument();
    expect(screen.getByTestId('product-new-submit')).toBeInTheDocument();
  });
});
