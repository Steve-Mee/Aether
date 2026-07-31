const keyFor = (tenantSlug: string) => `aether_cart_${tenantSlug}`;

export function readStoredCartId(tenantSlug: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(keyFor(tenantSlug));
  } catch {
    return null;
  }
}

export function writeStoredCartId(tenantSlug: string, cartId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(keyFor(tenantSlug), cartId);
  } catch {
    // ignore quota / private mode
  }
}

export function clearStoredCartId(tenantSlug: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(keyFor(tenantSlug));
  } catch {
    // ignore
  }
}
