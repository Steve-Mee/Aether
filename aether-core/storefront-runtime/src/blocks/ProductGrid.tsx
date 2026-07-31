'use client';

import { useStorefrontData } from '../context/StorefrontDataContext';
import type { BlockProps } from './types';
import { asNumber, asString } from './types';

/** Catalog grid — listing only in Birth (no cart API). */
export function ProductGrid({ props }: BlockProps) {
  const { products, tenantSlug } = useStorefrontData();
  const title = asString(props?.title, 'Products');
  const limit = asNumber(props?.limit, 24);
  const source = asString(props?.source, 'all');

  const visible = products.slice(0, limit);

  return (
    <section
      className="sf-section"
      aria-labelledby="sf-product-grid-heading"
      data-source={source}
    >
      <h2 id="sf-product-grid-heading" style={{ marginTop: 0 }}>
        {title}
      </h2>
      {visible.length === 0 ? (
        <p className="sf-muted" role="status">
          No products available.
        </p>
      ) : (
        <ul className="sf-grid">
          {visible.map((product) => (
            <li key={product.id}>
              <a
                className="sf-card-link"
                href={`/${tenantSlug}/products/${product.slug}`}
              >
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={320}
                    height={320}
                    style={{
                      aspectRatio: '1',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius)',
                      marginBottom: 'var(--spacing-sm)',
                      contentVisibility: 'auto',
                    }}
                  />
                ) : (
                  <div
                    aria-hidden
                    style={{
                      aspectRatio: '1',
                      background: 'var(--color-accent)',
                      opacity: 0.25,
                      borderRadius: 'var(--radius)',
                      marginBottom: 'var(--spacing-sm)',
                      contentVisibility: 'auto',
                    }}
                  />
                )}
                <strong>{product.name}</strong>
                <div className="sf-muted">
                  {product.currency} {product.price}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
