import type { OrderRowDemo } from '@/lib/data/types';
export type { OrderRowDemo } from '@/lib/data/types';

export function getOrdersDemoItems(): OrderRowDemo[] {
  const now = Date.now();
  return [
    {
      id: 'ord_demo_1',
      status: 'pending',
      total: 189.5,
      currency: 'EUR',
      createdAt: new Date(now - 3600_000).toISOString(),
    },
    {
      id: 'ord_demo_2',
      status: 'fulfilled',
      total: 412.0,
      currency: 'EUR',
      createdAt: new Date(now - 86_400_000).toISOString(),
    },
    {
      id: 'ord_demo_3',
      status: 'processing',
      total: 67.25,
      currency: 'EUR',
      createdAt: new Date(now - 172_800_000).toISOString(),
    },
    {
      id: 'ord_demo_4',
      status: 'cancelled',
      total: 24.99,
      currency: 'EUR',
      createdAt: new Date(now - 259_200_000).toISOString(),
    },
    {
      id: 'ord_demo_5',
      status: 'fulfilled',
      total: 1299.0,
      currency: 'EUR',
      createdAt: new Date(now - 432_000_000).toISOString(),
    },
  ];
}
