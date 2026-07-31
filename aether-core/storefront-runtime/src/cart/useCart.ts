'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  storefrontClient,
  StorefrontApiError,
  type StorefrontCart,
} from '../sdk/storefrontClient';
import {
  clearStoredCartId,
  readStoredCartId,
  writeStoredCartId,
} from './cartStorage';

export function useCart(tenantSlug: string) {
  const [cart, setCart] = useState<StorefrontCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tenantSlug) {
      setCart(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let cartId = readStoredCartId(tenantSlug);
      if (!cartId) {
        const created = await storefrontClient.createCart(tenantSlug);
        writeStoredCartId(tenantSlug, created.id);
        setCart(created);
        return;
      }
      try {
        const existing = await storefrontClient.getCart(tenantSlug, cartId);
        if (existing.status !== 'open') {
          clearStoredCartId(tenantSlug);
          const created = await storefrontClient.createCart(tenantSlug);
          writeStoredCartId(tenantSlug, created.id);
          setCart(created);
          return;
        }
        setCart(existing);
      } catch (err) {
        if (err instanceof StorefrontApiError && err.status === 404) {
          clearStoredCartId(tenantSlug);
          const created = await storefrontClient.createCart(tenantSlug);
          writeStoredCartId(tenantSlug, created.id);
          setCart(created);
          return;
        }
        throw err;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart');
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (productId: string, quantity = 1, variantId?: string | null) => {
      if (!cart) await refresh();
      const cartId = readStoredCartId(tenantSlug) ?? cart?.id;
      if (!cartId) throw new Error('No cart');
      const updated = await storefrontClient.addCartItem(tenantSlug, cartId, {
        productId,
        quantity,
        variantId,
      });
      setCart(updated);
      return updated;
    },
    [cart, refresh, tenantSlug]
  );

  const updateItem = useCallback(
    async (itemId: string, quantity: number) => {
      if (!cart) return;
      const updated = await storefrontClient.updateCartItem(
        tenantSlug,
        cart.id,
        itemId,
        quantity
      );
      setCart(updated);
      return updated;
    },
    [cart, tenantSlug]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!cart) return;
      const updated = await storefrontClient.removeCartItem(
        tenantSlug,
        cart.id,
        itemId
      );
      setCart(updated);
      return updated;
    },
    [cart, tenantSlug]
  );

  const clearLocalCart = useCallback(() => {
    clearStoredCartId(tenantSlug);
    setCart(null);
  }, [tenantSlug]);

  return {
    cart,
    loading,
    error,
    refresh,
    addItem,
    updateItem,
    removeItem,
    clearLocalCart,
  };
}
