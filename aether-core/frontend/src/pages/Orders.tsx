import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { t } from '../lib/i18n';
import FeatureStatusFromTruth from '../components/FeatureStatusFromTruth';

interface OrderRow {
  id: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
}

export default function Orders() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<OrderRow[]>('/api/orders')
      .then(setOrders)
      .catch((e) => setError(String(e.message)));
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-4xl font-semibold tracking-tight">{t('nav.orders')}</h1>
        <FeatureStatusFromTruth featureKey="order-management" />
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-3xl divide-y divide-[var(--color-border-subtle)]">
        {orders.length === 0 ? (
          <p className="p-8 text-[var(--color-text-muted)]">Nog geen bestellingen.</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="p-6 flex justify-between">
              <div>
                <p className="font-medium">{order.id.slice(0, 8)}…</p>
                <p className="text-sm text-[var(--color-text-muted)]">{order.status}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  {order.currency} {order.total.toFixed(2)}
                </p>
                <p className="text-xs text-[var(--color-text-subtle)]">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
