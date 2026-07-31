'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useStorefrontData } from '../context/StorefrontDataContext';
import { useCart } from './useCart';

type CartContextValue = ReturnType<typeof useCart>;

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { tenantSlug } = useStorefrontData();
  const cart = useCart(tenantSlug);

  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}

export function useStorefrontCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useStorefrontCart must be used within CartProvider');
  }
  return ctx;
}
