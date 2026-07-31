'use client';

import { ProductGrid } from '../../src/blocks/ProductGrid';
import { Hero } from '../../src/blocks/Hero';
import { StorefrontDataProvider } from '../../src/context/StorefrontDataContext';

/**
 * Static Lighthouse fixture — no backend required.
 * Serves Hero + ProductGrid with fixed demo products for CI CWV gates.
 */
const FIXTURE_PRODUCTS = [
  {
    id: 'p1',
    slug: 'bowl',
    name: 'Keramiek schaal',
    description: null as string | null,
    price: 42,
    currency: 'EUR',
    stock: 10,
    imageUrl: null as string | null,
  },
  {
    id: 'p2',
    slug: 'mug',
    name: 'Espresso mok',
    description: null as string | null,
    price: 18,
    currency: 'EUR',
    stock: 25,
    imageUrl: null as string | null,
  },
  {
    id: 'p3',
    slug: 'vase',
    name: 'Vaas mid',
    description: null as string | null,
    price: 65,
    currency: 'EUR',
    stock: 5,
    imageUrl: null as string | null,
  },
];

export default function LighthouseFixturePage() {
  return (
    <StorefrontDataProvider
      value={{
        tenantSlug: 'lh-fixture',
        products: FIXTURE_PRODUCTS,
      }}
    >
      <main data-testid="lh-fixture">
        <Hero
          props={{
            headline: 'AETHER fixture',
            subheadline: 'Lighthouse CWV gate — ProductGrid + Hero',
          }}
        />
        <ProductGrid props={{ title: 'Products', limit: 24 }} />
      </main>
    </StorefrontDataProvider>
  );
}
