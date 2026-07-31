import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import PaymentsPage from '@/pages/PaymentsPage';
import { renderWithProviders } from '@/test/render';

const getPaymentsSummary = vi.fn();
const listPayments = vi.fn();
const listPaymentPayouts = vi.fn();

vi.mock('@/features/commerce/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/commerce/api')>(
    '@/features/commerce/api',
  );
  return {
    ...actual,
    commerceApi: {
      ...actual.commerceApi,
      getPaymentsSummary: (...args: unknown[]) => getPaymentsSummary(...args),
      listPayments: (...args: unknown[]) => listPayments(...args),
      listPaymentPayouts: (...args: unknown[]) => listPaymentPayouts(...args),
      reconcilePayments: vi.fn(),
    },
  };
});

vi.mock('@/lib/useFeatureStatus', () => ({
  useFeatureStatus: () => 'partial' as const,
  invalidateTruthStatusCache: vi.fn(),
}));

describe('PaymentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPaymentsSummary.mockResolvedValue({
      status: 'partial',
      provider: 'local',
      connectConfigured: false,
      paymentCount: 2,
      byStatus: { pending: 1, paid: 1, failed: 0, refunded: 0 },
      paidAmount: 42,
      failedCount: 0,
      currency: 'EUR',
    });
    listPayments.mockResolvedValue([
      {
        id: 'pay_1',
        orderId: 'ord_1',
        amount: 42,
        currency: 'EUR',
        status: 'paid',
        paymentMethod: 'card',
        transactionId: 'txn_1',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
    ]);
    listPaymentPayouts.mockResolvedValue({
      status: 'partial',
      payouts: [],
      message: 'Payout ledger not implemented',
    });
  });

  it('renders payment summary and transaction table without live billing claims', async () => {
    renderWithProviders(<PaymentsPage />, {
      initialEntries: ['/payments'],
      withCommand: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('payments-page')).toBeInTheDocument();
    });
    const honesty = await screen.findByTestId('payments-honesty-note');
    expect(honesty).toBeInTheDocument();
    expect(honesty.textContent?.toLowerCase() ?? '').toMatch(/no live psp|geen live psp/);
    expect(honesty.textContent?.toLowerCase() ?? '').not.toMatch(/production payouts? live/);
    expect(await screen.findByTestId('payments-summary')).toBeInTheDocument();
    expect(await screen.findByTestId('payments-transactions')).toBeInTheDocument();
    expect(getPaymentsSummary).toHaveBeenCalled();
    expect(listPayments).toHaveBeenCalled();
    expect(listPaymentPayouts).toHaveBeenCalled();
  });

  it('handles gated/API errors', async () => {
    getPaymentsSummary.mockRejectedValue(new Error('Feature gated'));
    renderWithProviders(<PaymentsPage />, {
      initialEntries: ['/payments'],
      withCommand: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('payments-page')).toBeInTheDocument();
    });
    expect(await screen.findByText(/Feature gated/i)).toBeInTheDocument();
  });
});
