import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import homeTree from '../fixtures/home.tree.json';
import { StorefrontDataProvider } from '../src/context/StorefrontDataContext';
import { PageTreeRenderer } from '../src/renderer/PageTreeRenderer';
import type { PageTreeNode } from '../src/sdk/storefrontClient';

const fixtureProducts = [
  {
    id: 'p1',
    slug: 'kom-aarde',
    name: 'Kom Aarde',
    description: 'Handmade bowl',
    price: 42,
    currency: 'EUR',
    stock: 12,
    imageUrl: null,
  },
];

function renderTree(tree: PageTreeNode) {
  return render(
    <StorefrontDataProvider
      value={{ tenantSlug: 'atelier-noord', products: fixtureProducts }}
    >
      <PageTreeRenderer tree={tree} />
    </StorefrontDataProvider>
  );
}

describe('PageTreeRenderer', () => {
  it('renders Hero + ProductGrid from Appendix H home tree', () => {
    renderTree(homeTree as PageTreeNode);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Handmade keramiek' })
    ).toBeInTheDocument();
    expect(screen.getByText('Rustiek. Eerlijk. Lokaal.')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Shop collectie' })
    ).toHaveAttribute('href', '/products');
    expect(screen.getByRole('link', { name: 'Collectie' })).toHaveAttribute(
      'href',
      '/products'
    );
    expect(screen.getByText('Kom Aarde')).toBeInTheDocument();
    expect(screen.getByText('Verzendtijd?')).toBeInTheDocument();
    expect(screen.getByText('© Atelier Noord')).toBeInTheDocument();
  });

  it('renders safe fallback for unknown block types', () => {
    const tree: PageTreeNode = {
      type: 'Page',
      children: [
        { type: 'Hero', props: { headline: 'Safe' } },
        { type: 'EvilScript', props: { code: 'alert(1)' } },
      ],
    };

    expect(() => renderTree(tree)).not.toThrow();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Safe' })
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Unsupported block: EvilScript'
    );
    expect(screen.queryByText('alert(1)')).not.toBeInTheDocument();
  });
});
