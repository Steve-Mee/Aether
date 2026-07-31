import type { ReactNode } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider } from '../src/cart/CartProvider';
import { StorefrontDataProvider } from '../src/context/StorefrontDataContext';
import { CartDrawer } from '../src/blocks/CartDrawer';
import { CheckoutShell } from '../src/blocks/CheckoutShell';
import { ProductDetail } from '../src/blocks/ProductDetail';
import {
  StorefrontApiError,
  type StorefrontCart,
} from '../src/sdk/storefrontClient';

const products = [
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

const emptyCart: StorefrontCart = {
  id: 'cart_1',
  status: 'open',
  currency: 'EUR',
  customerId: null,
  items: [],
  createdAt: '2026-07-28T10:00:00.000Z',
  updatedAt: '2026-07-28T10:00:00.000Z',
};

const cartWithItem: StorefrontCart = {
  ...emptyCart,
  items: [
    {
      id: 'item_1',
      productId: 'p1',
      variantId: null,
      quantity: 1,
      unitPrice: 42,
    },
  ],
};

const {
  createCart,
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  checkout,
} = vi.hoisted(() => ({
  createCart: vi.fn(),
  getCart: vi.fn(),
  addCartItem: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
  checkout: vi.fn(),
}));

vi.mock('../src/sdk/storefrontClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/sdk/storefrontClient')>();
  return {
    ...actual,
    storefrontClient: {
      createCart,
      getCart,
      addCartItem,
      updateCartItem,
      removeCartItem,
      checkout,
    },
  };
});

function wrap(ui: ReactNode) {
  return render(
    <StorefrontDataProvider value={{ tenantSlug: 'atelier-noord', products }}>
      <CartProvider>{ui}</CartProvider>
    </StorefrontDataProvider>
  );
}

describe('Cart/Checkout blocks (P13)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    createCart.mockResolvedValue(emptyCart);
    getCart.mockResolvedValue(emptyCart);
    addCartItem.mockResolvedValue(cartWithItem);
    updateCartItem.mockResolvedValue(cartWithItem);
    removeCartItem.mockResolvedValue(emptyCart);
    checkout.mockResolvedValue({
      orderId: 'ord_1',
      clientSecret: 'local_cs_test',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('ProductDetail Add to cart updates CartDrawer', async () => {
    wrap(
      <>
        <ProductDetail props={{ slug: 'kom-aarde' }} />
        <CartDrawer props={{ label: 'Cart' }} />
      </>
    );

    await waitFor(() => {
      expect(createCart).toHaveBeenCalledWith('atelier-noord');
    });

    expect(screen.getByRole('status')).toHaveTextContent('Your cart is empty.');

    fireEvent.click(screen.getByRole('button', { name: /Add Kom Aarde to cart/i }));

    await waitFor(() => {
      expect(addCartItem).toHaveBeenCalledWith('atelier-noord', 'cart_1', {
        productId: 'p1',
        quantity: 1,
        variantId: undefined,
      });
    });

    await waitFor(() => {
      expect(
        screen.getByRole('spinbutton', { name: 'Quantity for Kom Aarde' })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Checkout' })).toHaveAttribute(
        'href',
        '/atelier-noord/checkout'
      );
    });
  });

  it('CheckoutShell place-order shows orderId + clientSecret', async () => {
    createCart.mockResolvedValue(cartWithItem);
    getCart.mockResolvedValue(cartWithItem);

    wrap(<CheckoutShell props={{ title: 'Checkout' }} />);

    await waitFor(() => {
      expect(screen.getByText(/Kom Aarde × 1/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Place test order' }));

    await waitFor(() => {
      expect(checkout).toHaveBeenCalledWith(
        'atelier-noord',
        expect.objectContaining({
          cartId: 'cart_1',
          customer: { email: 'ada@example.com' },
          paymentMethod: 'stripe',
          idempotencyKey: expect.any(String),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Order ID:/)).toBeInTheDocument();
      expect(screen.getByText('ord_1')).toBeInTheDocument();
      expect(screen.getByText('local_cs_test')).toBeInTheDocument();
    });
  });

  it('CheckoutShell disables place-order when cart empty', async () => {
    wrap(<CheckoutShell props={{ title: 'Checkout' }} />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        /Your cart is empty/i
      );
    });

    expect(
      screen.getByRole('button', { name: 'Place test order' })
    ).toBeDisabled();
  });

  it('ProductDetail surfaces STOCK_INSUFFICIENT from API', async () => {
    addCartItem.mockRejectedValue(
      new StorefrontApiError('Insufficient stock', 422, 'STOCK_INSUFFICIENT')
    );

    wrap(<ProductDetail props={{ slug: 'kom-aarde' }} />);

    await waitFor(() => {
      expect(createCart).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Add Kom Aarde to cart/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Not enough stock available.'
      );
    });
  });
});
