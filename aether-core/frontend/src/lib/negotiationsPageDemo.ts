export interface NegotiationRowDemo {
  id: string;
  status: string;
  currentOffer: number | null;
  productId: string | null;
  updatedAt: string;
}

export function getNegotiationsDemoItems(): NegotiationRowDemo[] {
  const now = Date.now();
  return [
    {
      id: 'neg_demo_1',
      status: 'active',
      currentOffer: 42.5,
      productId: 'prd_demo_1',
      updatedAt: new Date(now - 3600_000).toISOString(),
    },
    {
      id: 'neg_demo_2',
      status: 'accepted',
      currentOffer: 38.0,
      productId: 'prd_demo_4',
      updatedAt: new Date(now - 86400_000).toISOString(),
    },
    {
      id: 'neg_demo_3',
      status: 'stalled',
      currentOffer: null,
      productId: 'prd_demo_6',
      updatedAt: new Date(now - 172800_000).toISOString(),
    },
  ];
}
