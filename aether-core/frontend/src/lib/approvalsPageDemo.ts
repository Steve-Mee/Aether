import type { ApprovalItem } from '@/types/approval';

function hoursAgo(h: number): string {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d.toISOString();
}

/** Realistic pending approvals for mock data source. */
export function getApprovalsDemoItems(): ApprovalItem[] {
  return [
    {
      id: 'demo-approval-mail-1',
      module: 'aether-mail',
      actionType: 'email_response',
      payload: {
        emailId: 'demo-e1',
        from: 'klant@example.com',
        subject: 'Levering vertraagd — compensatie?',
        category: 'escalatie',
      },
      status: 'pending',
      createdAt: hoursAgo(1),
    },
    {
      id: 'demo-approval-refund-1',
      module: 'payment-fulfillment',
      actionType: 'refund',
      payload: { paymentId: 'demo-p1', amount: 89.5, currency: 'EUR' },
      status: 'pending',
      createdAt: hoursAgo(2),
    },
    {
      id: 'demo-approval-price-1',
      module: 'supplier-intelligence',
      actionType: 'price_change',
      payload: { supplierId: 'demo_sup_nordic', decision: 'Verhoog met 4%' },
      status: 'pending',
      createdAt: hoursAgo(5),
    },
    {
      id: 'demo-approval-discount-1',
      module: 'commerce',
      actionType: 'discount',
      payload: { sku: 'SKU-4421', percent: 15 },
      status: 'pending',
      createdAt: hoursAgo(8),
    },
    {
      id: 'demo-approval-price-2',
      module: 'supplier-intelligence',
      actionType: 'price_change',
      payload: { supplierId: 'demo_sup_greenline', decision: 'Sync inkoopprijs −3%' },
      status: 'pending',
      createdAt: hoursAgo(12),
    },
  ];
}
