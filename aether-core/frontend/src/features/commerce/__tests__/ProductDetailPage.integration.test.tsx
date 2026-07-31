import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProductDetailPage from '@/pages/ProductDetailPage';
import { renderWithProviders } from '@/test/render';
import { Route, Routes } from 'react-router-dom';

const getProduct = vi.fn();
const uploadMedia = vi.fn();

const baseProduct = {
  id: 'prod_a',
  name: 'Kom Aarde',
  description: 'Handmade',
  slug: 'kom-aarde',
  status: 'active',
  price: 42,
  stock: 12,
  seoTitle: null,
  seoDescription: null,
  categoryId: null,
  variants: [],
  media: [] as Array<{ id: string; mediaAssetId: string; url: string; mimeType: string }>,
};

vi.mock('@/features/commerce/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/commerce/api')>(
    '@/features/commerce/api',
  );
  return {
    ...actual,
    commerceApi: {
      ...actual.commerceApi,
      getProduct: (...args: unknown[]) => getProduct(...args),
      uploadMedia: (...args: unknown[]) => uploadMedia(...args),
    },
  };
});

vi.mock('@/lib/useFeatureStatus', () => ({
  useFeatureStatus: () => 'partial' as const,
  invalidateTruthStatusCache: vi.fn(),
}));

describe('ProductDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProduct.mockResolvedValue({ ...baseProduct, media: [] });
    uploadMedia.mockResolvedValue({
      product: {
        ...baseProduct,
        media: [
          {
            id: 'pm_1',
            mediaAssetId: 'ma_1',
            url: '/api/media/tenant_a/file.png',
            mimeType: 'image/png',
          },
        ],
      },
    });
  });

  it('renders product tabs', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/products/:id" element={<ProductDetailPage />} />
      </Routes>,
      { initialEntries: ['/products/prod_a'], withCommand: false },
    );

    await waitFor(() => {
      expect(screen.getByTestId('product-detail-page')).toBeInTheDocument();
    });
    expect(await screen.findByTestId('product-tab-general')).toBeInTheDocument();
    expect(screen.getByTestId('product-tab-variants')).toBeInTheDocument();
  });

  it('exposes tablist landmarks and labeled fields (a11y)', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/products/:id" element={<ProductDetailPage />} />
      </Routes>,
      { initialEntries: ['/products/prod_a'], withCommand: false },
    );

    expect(await screen.findByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { selected: true })).toBeInTheDocument();
    expect(screen.getByLabelText(/^product$/i)).toBeInTheDocument();
  });

  it('uploads media from the media tab', async () => {
    const user = userEvent.setup();
    getProduct
      .mockResolvedValueOnce({ ...baseProduct, media: [] })
      .mockResolvedValueOnce({
        ...baseProduct,
        media: [
          {
            id: 'pm_1',
            mediaAssetId: 'ma_1',
            url: '/api/media/tenant_a/file.png',
            mimeType: 'image/png',
          },
        ],
      });

    renderWithProviders(
      <Routes>
        <Route path="/products/:id" element={<ProductDetailPage />} />
      </Routes>,
      { initialEntries: ['/products/prod_a'], withCommand: false },
    );

    await screen.findByTestId('product-detail-page');
    await screen.findByTestId('product-tab-media');
    await user.click(screen.getByTestId('product-tab-media'));

    const input = screen.getByTestId('product-media-upload') as HTMLInputElement;
    const file = new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47])], 'kom.png', {
      type: 'image/png',
    });
    await user.upload(input, file);

    await waitFor(() => {
      expect(uploadMedia).toHaveBeenCalledWith(
        'prod_a',
        expect.objectContaining({
          filename: 'kom.png',
          mimeType: 'image/png',
          contentBase64: expect.any(String),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('/api/media/tenant_a/file.png')).toBeInTheDocument();
    });
  });
});
