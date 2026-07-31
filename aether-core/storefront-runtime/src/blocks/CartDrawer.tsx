'use client';

import { useStorefrontCart } from '../cart/CartProvider';
import { useStorefrontData } from '../context/StorefrontDataContext';
import type { BlockProps } from './types';
import { asString } from './types';

/** Live cart drawer wired to public cart API (P13). */
export function CartDrawer({ props }: BlockProps) {
  const label = asString(props?.label, 'Cart');
  const { tenantSlug, products } = useStorefrontData();
  const { cart, loading, error, updateItem, removeItem } = useStorefrontCart();

  const items = cart?.items ?? [];
  const checkoutHref = tenantSlug ? `/${tenantSlug}/checkout` : '/checkout';

  const nameFor = (productId: string) =>
    products.find((p) => p.id === productId)?.name ?? productId;

  return (
    <aside className="sf-section" aria-label={label} role="complementary">
      <h2 style={{ marginTop: 0, fontSize: '1.125rem' }}>{label}</h2>

      {loading && !cart ? (
        <p className="sf-muted" role="status">
          Loading cart…
        </p>
      ) : null}

      {error ? (
        <p role="alert" style={{ color: 'var(--color-primary)' }}>
          {error}
        </p>
      ) : null}

      {!loading && items.length === 0 ? (
        <p className="sf-muted" role="status">
          Your cart is empty.
        </p>
      ) : null}

      {items.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((item) => (
            <li
              key={item.id}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                marginBottom: 'var(--spacing-sm)',
              }}
            >
              <span style={{ flex: '1 1 8rem' }}>{nameFor(item.productId)}</span>
              <label>
                Qty{' '}
                <input
                  type="number"
                  role="spinbutton"
                  min={1}
                  value={item.quantity}
                  aria-label={`Quantity for ${nameFor(item.productId)}`}
                  onChange={(e) => {
                    const qty = Number(e.target.value);
                    if (Number.isFinite(qty) && qty >= 1) {
                      void updateItem(item.id, qty);
                    }
                  }}
                  style={{ width: '4rem' }}
                />
              </label>
              <button type="button" onClick={() => void removeItem(item.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {items.length > 0 ? (
        <p style={{ marginTop: 'var(--spacing-md)' }}>
          <a href={checkoutHref}>Checkout</a>
        </p>
      ) : null}
    </aside>
  );
}
