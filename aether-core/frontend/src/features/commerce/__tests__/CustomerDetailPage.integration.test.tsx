import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CustomerDetailPage from '@/pages/CustomerDetailPage';
import { renderWithProviders } from '@/test/render';
import { Route, Routes } from 'react-router-dom';

const getCustomer = vi.fn();
const listCustomerOrders = vi.fn();

vi.mock('@/features/commerce/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/commerce/api')>(
    '@/features/commerce/api',
  );
  return {
    ...actual,
    commerceApi: {
      ...actual.commerceApi,
      getCustomer: (...args: unknown[]) => getCustomer(...args),
      listCustomerOrders: (...args: unknown[]) => listCustomerOrders(...args),
    },
  };
});

vi.mock('@/lib/useFeatureStatus', () => ({
  useFeatureStatus: () => 'partial' as const,
  invalidateTruthStatusCache: vi.fn(),
}));

describe('CustomerDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCustomer.mockResolvedValue({
      id: 'cust_1',
      email: 'ada@example.com',
      name: 'Ada L',
      segment: 'vip',
      orderCount: 2,
      totalSpent: 180,
      lastOrderAt: '2026-07-01T00:00:00.000Z',
      churnRisk: false,
    });
    listCustomerOrders.mockResolvedValue([
      {
        id: 'ord_abc1234567',
        status: 'paid',
        total: 90,
        currency: 'EUR',
        createdAt: '2026-07-01T00:00:00.000Z',
      },
      {
        id: 'ord_def9876543',
        status: 'shipped',
        total: 90,
        currency: 'EUR',
        createdAt: '2026-06-15T00:00:00.000Z',
      },
    ]);
  });

  it('renders KPIs and customer orders from fixtures', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
      </Routes>,
      { initialEntries: ['/customers/cust_1'], withCommand: false },
    );

    await waitFor(() => {
      expect(screen.getByTestId('customer-detail-page')).toBeInTheDocument();
    });

    expect(await screen.findByTestId('customer-kpis')).toBeInTheDocument();
    expect(screen.getByText('Ada L')).toBeInTheDocument();
    expect(getCustomer).toHaveBeenCalledWith('cust_1');
    expect(listCustomerOrders).toHaveBeenCalledWith('cust_1');

    expect(await screen.findByText('ord_abc123')).toBeInTheDocument();
    expect(screen.getByText('paid')).toBeInTheDocument();
    expect(screen.getByText('shipped')).toBeInTheDocument();
  });
});
