'use client';

import { useState, type FormEvent } from 'react';
import { useStorefrontCart } from '../cart/CartProvider';
import { useStorefrontData } from '../context/StorefrontDataContext';
import {
  storefrontClient,
  StorefrontApiError,
  type CheckoutResult,
} from '../sdk/storefrontClient';
import type { BlockProps } from './types';
import { asString } from './types';

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `chk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Interactive checkout sandbox (P13) — no Stripe Elements. */
export function CheckoutShell({ props }: BlockProps) {
  const title = asString(props?.title, 'Checkout');
  const { tenantSlug, products } = useStorefrontData();
  const { cart, loading, clearLocalCart, refresh } = useStorefrontCart();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);

  const items = cart?.items ?? [];
  const empty = items.length === 0;
  const nameFor = (productId: string) =>
    products.find((p) => p.id === productId)?.name ?? productId;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!cart || empty) return;

    setPending(true);
    setError(null);
    try {
      const checkout = await storefrontClient.checkout(tenantSlug, {
        cartId: cart.id,
        customer: {
          email: email.trim(),
          ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
          ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
        },
        paymentMethod: 'stripe',
        idempotencyKey: newIdempotencyKey(),
      });
      setResult(checkout);
      clearLocalCart();
      await refresh();
    } catch (err) {
      if (err instanceof StorefrontApiError) {
        if (err.code === 'CART_EMPTY') {
          setError('Your cart is empty.');
        } else if (err.code === 'STOCK_INSUFFICIENT') {
          setError('Not enough stock available.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Checkout failed');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="sf-section" aria-labelledby="sf-checkout-heading">
      <h1 id="sf-checkout-heading" style={{ marginTop: 0 }}>
        {title}
      </h1>

      {result ? (
        <div role="status">
          <p>Order placed (sandbox).</p>
          <p>
            Order ID: <code>{result.orderId}</code>
          </p>
          {result.clientSecret ? (
            <p>
              Payment client secret: <code>{result.clientSecret}</code>
            </p>
          ) : null}
        </div>
      ) : (
        <>
          {loading && !cart ? (
            <p className="sf-muted" role="status">
              Loading cart…
            </p>
          ) : null}

          {empty ? (
            <p className="sf-muted" role="status">
              Your cart is empty. Add a product before checkout.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {items.map((item) => (
                <li key={item.id}>
                  {nameFor(item.productId)} × {item.quantity}
                  {item.unitPrice != null
                    ? ` — ${cart?.currency ?? ''} ${item.unitPrice}`
                    : ''}
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={(e) => void onSubmit(e)} style={{ marginTop: 'var(--spacing-md)' }}>
            <p>
              <label htmlFor="sf-checkout-email">
                Email{' '}
                <input
                  id="sf-checkout-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            </p>
            <p>
              <label htmlFor="sf-checkout-first">
                First name{' '}
                <input
                  id="sf-checkout-first"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </label>
            </p>
            <p>
              <label htmlFor="sf-checkout-last">
                Last name{' '}
                <input
                  id="sf-checkout-last"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </label>
            </p>
            <p>
              <button type="submit" disabled={empty || pending || !cart}>
                {pending ? 'Placing order…' : 'Place test order'}
              </button>
            </p>
          </form>

          {error ? (
            <p role="alert" style={{ color: 'var(--color-primary)' }}>
              {error}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
