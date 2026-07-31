'use client';

import { useState } from 'react';
import { useStorefrontCart } from '../cart/CartProvider';
import { useStorefrontData } from '../context/StorefrontDataContext';
import { StorefrontApiError } from '../sdk/storefrontClient';
import type { BlockProps } from './types';
import { asString } from './types';

/** PDP with add-to-cart (P13). */
export function ProductDetail({ props }: BlockProps) {
  const { products } = useStorefrontData();
  const { addItem } = useStorefrontCart();
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const slug = asString(props?.slug);
  const product =
    (slug ? products.find((p) => p.slug === slug) : undefined) ?? products[0];

  if (!product) {
    return (
      <section className="sf-section" role="status">
        <p className="sf-muted">Product not found.</p>
      </section>
    );
  }

  const outOfStock = product.stock <= 0;

  const onAdd = async () => {
    setPending(true);
    setActionError(null);
    setAdded(false);
    try {
      await addItem(product.id, 1);
      setAdded(true);
    } catch (err) {
      if (err instanceof StorefrontApiError) {
        setActionError(
          err.code === 'STOCK_INSUFFICIENT'
            ? 'Not enough stock available.'
            : err.message
        );
      } else {
        setActionError(err instanceof Error ? err.message : 'Failed to add to cart');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <article className="sf-section" aria-labelledby="sf-pdp-heading">
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt=""
          style={{
            maxWidth: '28rem',
            borderRadius: 'var(--radius)',
            marginBottom: 'var(--spacing-md)',
          }}
        />
      ) : null}
      <h1 id="sf-pdp-heading" style={{ marginTop: 0 }}>
        {asString(props?.name, product.name)}
      </h1>
      <p className="sf-muted">
        {product.currency} {product.price}
      </p>
      {product.description ? <p>{product.description}</p> : null}
      <p style={{ marginTop: 'var(--spacing-md)' }}>
        <button
          type="button"
          disabled={outOfStock || pending}
          onClick={() => void onAdd()}
          aria-label={`Add ${product.name} to cart`}
        >
          {pending ? 'Adding…' : outOfStock ? 'Out of stock' : 'Add to cart'}
        </button>
      </p>
      {added ? (
        <p className="sf-muted" role="status">
          Added to cart.
        </p>
      ) : null}
      {actionError ? (
        <p role="alert" style={{ color: 'var(--color-primary)' }}>
          {actionError}
        </p>
      ) : null}
    </article>
  );
}
