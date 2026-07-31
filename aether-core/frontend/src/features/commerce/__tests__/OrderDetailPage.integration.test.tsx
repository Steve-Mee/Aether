import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import OrderDetailPage from '@/pages/OrderDetailPage';
import { renderWithProviders } from '@/test/render';
import { Route, Routes } from 'react-router-dom';

const getOrder = vi.fn();
const refundOrder = vi.fn();
const shipOrder = vi.fn();

vi.mock('@/features/commerce/api', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/commerce/api')>('@/features/commerce/api');
  return {
    ...actual,
    commerceApi: {
      ...actual.commerceApi,
      getOrder: (...args: unknown[]) => getOrder(...args),
      refundOrder: (...args: unknown[]) => refundOrder(...args),
      shipOrder: (...args: unknown[]) => shipOrder(...args),
    },
  };
});

vi.mock('@/lib/useFeatureStatus', () => ({
  useFeatureStatus: () => 'partial' as const,
  invalidateTruthStatusCache: vi.fn(),
}));

describe('OrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOrder.mockResolvedValue({
      id: 'ord_1',
      customerId: 'cust_1',
      status: 'paid',
      total: 100,
      currency: 'EUR',
      createdAt: '2026-07-26T08:00:00.000Z',
      items: [{ id: 'oi_1', productId: 'prod_a', quantity: 1, price: 100 }],
      customer: { id: 'cust_1', email: 'ada@example.com', name: 'Ada L' },
      shipments: [],
      refunds: [],
      payment: { id: 'pay_1', status: 'paid', amount: 100, paymentMethod: 'stripe' },
    });
    refundOrder.mockResolvedValue({
      refund: { id: 'ref_1', status: 'pending' },
      approval: { id: 'appr_1', status: 'pending' },
    });
    shipOrder.mockResolvedValue({ shipment: { id: 'ship_1' }, order: {} });
  });

  it('renders order detail and creates refund approval', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>,
      { initialEntries: ['/orders/ord_1'], withCommand: false },
    );

    expect(await screen.findByTestId('order-detail-page')).toBeInTheDocument();
    expect(await screen.findByTestId('order-status-chip')).toHaveTextContent('paid');

    await user.click(await screen.findByTestId('order-refund-submit'));

    await waitFor(() => {
      expect(refundOrder).toHaveBeenCalled();
    });
    expect(await screen.findByTestId('order-refund-approval')).toBeInTheDocument();
  });

  it('exposes status region and labeled ship/refund fields (a11y)', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>,
      { initialEntries: ['/orders/ord_1'], withCommand: false },
    );

    expect(await screen.findByTestId('order-status-chip')).toBeInTheDocument();
    expect(screen.getByTestId('order-status-chip')).toHaveAttribute('role', 'status');
    expect(await screen.findByLabelText(/carrier|vervoerder/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tracking/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount|bedrag/i)).toBeInTheDocument();
  });
});
