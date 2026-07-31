/**
 * Public Storefront API client.
 * Reads NEXT_PUBLIC_AETHER_API_BASE — no admin keys, no merchant code execution.
 */

export interface StorefrontSite {
  slug: string;
  status: string;
  revisionId: string;
  locales: string[];
  tokens: Record<string, unknown>;
}

export interface StorefrontProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  stock: number;
  imageUrl: string | null;
  variants?: unknown[];
}

export interface StorefrontPage {
  id: string;
  path: string;
  title: string;
  seoJson: Record<string, unknown> | null;
  treeJson: PageTreeNode;
}

export interface PageTreeNode {
  type: string;
  props?: Record<string, unknown>;
  children?: PageTreeNode[];
}

export interface StorefrontCartItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number | null;
}

export interface StorefrontCart {
  id: string;
  status: string;
  currency: string;
  customerId: string | null;
  items: StorefrontCartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutResult {
  orderId: string;
  clientSecret?: string;
  redirectUrl?: string;
}

export class StorefrontApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'StorefrontApiError';
  }
}

function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_AETHER_API_BASE?.trim();
  if (!base) {
    throw new Error('NEXT_PUBLIC_AETHER_API_BASE is required');
  }
  return base.replace(/\/+$/, '');
}

function previewAuthHeader(previewToken?: string): HeadersInit {
  if (!previewToken) return {};
  return { Authorization: `Preview ${previewToken}` };
}

async function parseError(res: Response): Promise<StorefrontApiError> {
  let code: string | undefined;
  let message = `Storefront API ${res.status}`;
  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string };
    };
    code = body.error?.code;
    if (body.error?.message) message = body.error.message;
  } catch {
    // ignore parse errors
  }
  return new StorefrontApiError(message, res.status, code);
}

async function apiGet<T>(
  path: string,
  opts?: { previewToken?: string; searchParams?: Record<string, string | undefined> }
): Promise<T> {
  const url = new URL(`${getApiBase()}${path}`);
  if (opts?.searchParams) {
    for (const [key, value] of Object.entries(opts.searchParams)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      ...previewAuthHeader(opts?.previewToken),
    },
    cache: 'no-store',
  });

  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

async function apiSend<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  opts?: {
    body?: unknown;
    headers?: Record<string, string>;
  }
): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(opts?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...opts?.headers,
    },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const storefrontClient = {
  async resolveSite(
    tenantSlug: string,
    previewToken?: string
  ): Promise<StorefrontSite> {
    const data = await apiGet<{ site: StorefrontSite }>(
      `/api/storefront/${encodeURIComponent(tenantSlug)}`,
      { previewToken }
    );
    return data.site;
  },

  async getPage(
    tenantSlug: string,
    path: string,
    previewToken?: string
  ): Promise<StorefrontPage> {
    const data = await apiGet<{ page: StorefrontPage }>(
      `/api/storefront/${encodeURIComponent(tenantSlug)}/pages`,
      { previewToken, searchParams: { path } }
    );
    return data.page;
  },

  async getCatalog(
    tenantSlug: string,
    opts?: { limit?: number; cursor?: string | null }
  ): Promise<{ products: StorefrontProduct[]; nextCursor: string | null }> {
    const data = await apiGet<{
      products: StorefrontProduct[];
      nextCursor: string | null;
    }>(`/api/storefront/${encodeURIComponent(tenantSlug)}/catalog`, {
      searchParams: {
        limit: opts?.limit !== undefined ? String(opts.limit) : undefined,
        cursor: opts?.cursor ?? undefined,
      },
    });
    return data;
  },

  async getProduct(
    tenantSlug: string,
    productSlug: string
  ): Promise<StorefrontProduct> {
    const data = await apiGet<{ product: StorefrontProduct }>(
      `/api/storefront/${encodeURIComponent(tenantSlug)}/products/${encodeURIComponent(productSlug)}`
    );
    return data.product;
  },

  async createCart(tenantSlug: string): Promise<StorefrontCart> {
    const data = await apiSend<{ cart: StorefrontCart }>(
      'POST',
      `/api/storefront/${encodeURIComponent(tenantSlug)}/carts`
    );
    return data.cart;
  },

  async getCart(tenantSlug: string, cartId: string): Promise<StorefrontCart> {
    const data = await apiGet<{ cart: StorefrontCart }>(
      `/api/storefront/${encodeURIComponent(tenantSlug)}/carts/${encodeURIComponent(cartId)}`
    );
    return data.cart;
  },

  async addCartItem(
    tenantSlug: string,
    cartId: string,
    input: { productId: string; variantId?: string | null; quantity: number }
  ): Promise<StorefrontCart> {
    const data = await apiSend<{ cart: StorefrontCart }>(
      'POST',
      `/api/storefront/${encodeURIComponent(tenantSlug)}/carts/${encodeURIComponent(cartId)}/items`,
      { body: input }
    );
    return data.cart;
  },

  async updateCartItem(
    tenantSlug: string,
    cartId: string,
    itemId: string,
    quantity: number
  ): Promise<StorefrontCart> {
    const data = await apiSend<{ cart: StorefrontCart }>(
      'PATCH',
      `/api/storefront/${encodeURIComponent(tenantSlug)}/carts/${encodeURIComponent(cartId)}/items/${encodeURIComponent(itemId)}`,
      { body: { quantity } }
    );
    return data.cart;
  },

  async removeCartItem(
    tenantSlug: string,
    cartId: string,
    itemId: string
  ): Promise<StorefrontCart> {
    const data = await apiSend<{ cart: StorefrontCart }>(
      'DELETE',
      `/api/storefront/${encodeURIComponent(tenantSlug)}/carts/${encodeURIComponent(cartId)}/items/${encodeURIComponent(itemId)}`
    );
    return data.cart;
  },

  async checkout(
    tenantSlug: string,
    input: {
      cartId: string;
      customer: { email: string; firstName?: string; lastName?: string };
      shippingAddress?: Record<string, unknown>;
      paymentMethod?: string;
      idempotencyKey: string;
    }
  ): Promise<CheckoutResult> {
    return apiSend<CheckoutResult>(
      'POST',
      `/api/storefront/${encodeURIComponent(tenantSlug)}/checkout`,
      {
        body: {
          cartId: input.cartId,
          customer: input.customer,
          shippingAddress: input.shippingAddress,
          paymentMethod: input.paymentMethod ?? 'stripe',
          idempotencyKey: input.idempotencyKey,
        },
        headers: { 'Idempotency-Key': input.idempotencyKey },
      }
    );
  },
};
