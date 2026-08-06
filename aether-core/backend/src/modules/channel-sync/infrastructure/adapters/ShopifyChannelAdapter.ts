import type { ChannelSyncPort, ChannelOAuthPort } from '../../application/ports/ChannelSyncPort';

import type {

  ChannelProduct,

  ChannelOrder,

  ChannelInventoryUpdate,

  ChannelMetrics,

  ChannelSyncResult,

  ChannelConnectionConfig,

} from '../../domain/types';

import {

  aggregateOrderMetrics,

  normalizeShopifyHost,

  shopifyAdminBase,

} from './channelAdapterUtils';



export class ShopifyChannelAdapter implements ChannelSyncPort, ChannelOAuthPort {

  constructor(private getConfig: (tenantId: string) => Promise<ChannelConnectionConfig | null>) {}



  private shopifyHeaders(accessToken: string): Record<string, string> {

    return {

      'X-Shopify-Access-Token': accessToken,

      'Content-Type': 'application/json',

    };

  }



  async getProducts(params: {

    tenantId: string;

    limit?: number;

    offset?: number;

  }): Promise<ChannelSyncResult<ChannelProduct[]>> {

    const config = await this.getConfig(params.tenantId);

    if (!config) {

      return {

        success: false,

        error: 'Channel not configured',

        syncedAt: new Date(),

      };

    }



    const limit = params.limit ?? 50;

    const offset = params.offset ?? 0;



    try {

      const response = await fetch(

        `${shopifyAdminBase(config.storeUrl)}/admin/api/2024-01/products.json?limit=${limit}&offset=${offset}`,

        {

          headers: this.shopifyHeaders(config.credentials.accessToken ?? ''),

        }

      );



      if (!response.ok) {

        return {

          success: false,

          error: `Shopify API error: ${response.status}`,

          syncedAt: new Date(),

        };

      }



      const data = (await response.json()) as { products: ShopifyProduct[] };



      const products: ChannelProduct[] = data.products.map((p) => ({

        externalId: p.id.toString(),

        name: p.title,

        description: p.body_html,

        price: parseFloat(p.variants?.[0]?.price ?? '0'),

        currency: 'EUR',

        stock: p.variants?.[0]?.inventory_quantity ?? 0,

        sku: p.variants?.[0]?.sku,

        imageUrl: p.image?.src,

        variants: p.variants?.map((v) => ({

          externalId: v.id.toString(),

          sku: v.sku ?? '',

          price: parseFloat(v.price),

          stock: v.inventory_quantity ?? 0,

        })),

        metadata: { shopifyHandle: p.handle },

      }));



      return {

        success: true,

        data: products,

        syncedAt: new Date(),

      };

    } catch (error) {

      return {

        success: false,

        error: `Failed to fetch products: ${error instanceof Error ? error.message : String(error)}`,

        syncedAt: new Date(),

      };

    }

  }



  async getOrders(params: {

    tenantId: string;

    since?: Date;

    limit?: number;

  }): Promise<ChannelSyncResult<ChannelOrder[]>> {

    const config = await this.getConfig(params.tenantId);

    if (!config) {

      return {

        success: false,

        error: 'Channel not configured',

        syncedAt: new Date(),

      };

    }



    const limit = params.limit ?? 50;

    const sinceParam = params.since ? `&created_at_min=${params.since.toISOString()}` : '';



    try {

      const response = await fetch(

        `${shopifyAdminBase(config.storeUrl)}/admin/api/2024-01/orders.json?limit=${limit}&status=any${sinceParam}`,

        {

          headers: this.shopifyHeaders(config.credentials.accessToken ?? ''),

        }

      );



      if (!response.ok) {

        return {

          success: false,

          error: `Shopify API error: ${response.status}`,

          syncedAt: new Date(),

        };

      }



      const data = (await response.json()) as { orders: ShopifyOrder[] };



      const orders: ChannelOrder[] = data.orders.map((o) => ({

        externalId: o.id.toString(),

        orderNumber: o.order_number.toString(),

        customerEmail: o.email ?? '',

        customerName: `${o.customer?.first_name ?? ''} ${o.customer?.last_name ?? ''}`.trim(),

        total: parseFloat(o.total_price),

        currency: o.currency,

        status: o.financial_status ?? 'unknown',

        items: o.line_items.map((item) => ({

          productExternalId: item.product_id?.toString() ?? '',

          variantExternalId: item.variant_id?.toString(),

          quantity: item.quantity,

          price: parseFloat(item.price),

          name: item.title,

        })),

        createdAt: new Date(o.created_at),

        metadata: { shopifyOrderId: o.id },

      }));



      return {

        success: true,

        data: orders,

        syncedAt: new Date(),

      };

    } catch (error) {

      return {

        success: false,

        error: `Failed to fetch orders: ${error instanceof Error ? error.message : String(error)}`,

        syncedAt: new Date(),

      };

    }

  }



  async pushInventoryUpdate(params: {

    tenantId: string;

    updates: ChannelInventoryUpdate[];

  }): Promise<ChannelSyncResult<{ updated: number }>> {

    const config = await this.getConfig(params.tenantId);

    if (!config) {

      return {

        success: false,

        error: 'Channel not configured',

        syncedAt: new Date(),

      };

    }



    if (!config.credentials.accessToken) {

      return {

        success: false,

        error: 'Shopify access token missing — complete OAuth or add credentials',

        syncedAt: new Date(),

      };

    }



    if (params.updates.length === 0) {

      return { success: true, data: { updated: 0 }, syncedAt: new Date() };

    }



    let updated = 0;

    const errors: string[] = [];

    const base = shopifyAdminBase(config.storeUrl);



    for (const update of params.updates) {

      const variantId = update.variantExternalId;

      if (!variantId) {

        errors.push(`Product ${update.productExternalId}: variantExternalId required for Shopify`);

        continue;

      }



      try {

        const response = await fetch(`${base}/admin/api/2024-01/variants/${variantId}.json`, {

          method: 'PUT',

          headers: this.shopifyHeaders(config.credentials.accessToken),

          body: JSON.stringify({

            variant: {

              id: Number(variantId),

              inventory_quantity: update.quantity,

            },

          }),

        });



        if (!response.ok) {

          errors.push(`Variant ${variantId}: Shopify API ${response.status}`);

          continue;

        }

        updated++;

      } catch (err) {

        errors.push(

          `Variant ${variantId}: ${err instanceof Error ? err.message : String(err)}`

        );

      }

    }



    if (updated === 0 && errors.length > 0) {

      return {

        success: false,

        error: errors.join('; '),

        syncedAt: new Date(),

      };

    }



    return {

      success: true,

      data: { updated },

      error: errors.length ? errors.join('; ') : undefined,

      syncedAt: new Date(),

    };

  }



  async getMetrics(params: {

    tenantId: string;

    start: Date;

    end: Date;

  }): Promise<ChannelSyncResult<ChannelMetrics>> {

    const ordersResult = await this.getOrders({

      tenantId: params.tenantId,

      since: params.start,

      limit: 250,

    });



    if (!ordersResult.success || !ordersResult.data) {

      return {

        success: false,

        error: ordersResult.error ?? 'Failed to fetch orders for metrics',

        syncedAt: new Date(),

      };

    }



    return {

      success: true,

      data: aggregateOrderMetrics(ordersResult.data, params.start, params.end),

      syncedAt: new Date(),

    };

  }



  async testConnection(tenantId: string): Promise<ChannelSyncResult<{ connected: boolean }>> {

    const config = await this.getConfig(tenantId);

    if (!config) {

      return {

        success: false,

        error: 'Channel not configured',

        syncedAt: new Date(),

      };

    }



    try {

      const response = await fetch(`${shopifyAdminBase(config.storeUrl)}/admin/api/2024-01/shop.json`, {

        headers: this.shopifyHeaders(config.credentials.accessToken ?? ''),

      });



      return {

        success: response.ok,

        data: { connected: response.ok },

        error: response.ok ? undefined : `Shopify API error: ${response.status}`,

        syncedAt: new Date(),

      };

    } catch (err) {

      return {

        success: false,

        data: { connected: false },

        error: err instanceof Error ? err.message : String(err),

        syncedAt: new Date(),

      };

    }

  }



  async getAuthUrl(params: {

    tenantId: string;

    redirectUri: string;

    storeUrl?: string;

  }): Promise<string> {

    const config = await this.getConfig(params.tenantId);

    const storeUrl = params.storeUrl ?? config?.storeUrl;

    if (!storeUrl) {

      throw new Error('Store URL required — set storeUrl on the connection first');

    }



    const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();

    if (!clientId) {

      throw new Error('SHOPIFY_CLIENT_ID is not configured');

    }



    const scopes = 'read_products,read_orders,write_inventory';

    const state = Buffer.from(

      JSON.stringify({ tenantId: params.tenantId, timestamp: Date.now() })

    ).toString('base64');

    const shop = normalizeShopifyHost(storeUrl);



    return `https://${shop}/admin/oauth/authorize?client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(params.redirectUri)}&state=${encodeURIComponent(state)}`;

  }



  async exchangeCodeForToken(params: {

    tenantId: string;

    code: string;

    redirectUri: string;

  }): Promise<

    ChannelSyncResult<{

      accessToken: string;

      refreshToken?: string;

      expiresAt?: Date;

    }>

  > {

    const config = await this.getConfig(params.tenantId);

    if (!config?.storeUrl) {

      return {

        success: false,

        error: 'Connection store URL not configured',

        syncedAt: new Date(),

      };

    }



    const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();

    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) {

      return {

        success: false,

        error: 'SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET must be configured',

        syncedAt: new Date(),

      };

    }



    const shop = normalizeShopifyHost(config.storeUrl);



    try {

      const response = await fetch(`https://${shop}/admin/oauth/access_token`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          client_id: clientId,

          client_secret: clientSecret,

          code: params.code,

        }),

      });



      if (!response.ok) {

        const body = await response.text();

        return {

          success: false,

          error: `Shopify token exchange failed (${response.status}): ${body}`,

          syncedAt: new Date(),

        };

      }



      const data = (await response.json()) as { access_token: string; scope?: string };

      if (!data.access_token) {

        return {

          success: false,

          error: 'Shopify token exchange returned no access_token',

          syncedAt: new Date(),

        };

      }



      return {

        success: true,

        data: { accessToken: data.access_token },

        syncedAt: new Date(),

      };

    } catch (err) {

      return {

        success: false,

        error: err instanceof Error ? err.message : String(err),

        syncedAt: new Date(),

      };

    }

  }



  async refreshAccessToken(_params: {

    tenantId: string;

    refreshToken: string;

  }): Promise<ChannelSyncResult<{ accessToken: string; expiresAt?: Date }>> {

    return {

      success: false,

      error: 'Shopify uses long-lived offline tokens — refresh not required',

      syncedAt: new Date(),

    };

  }

}



interface ShopifyProduct {

  id: number;

  title: string;

  body_html?: string;

  handle: string;

  variants?: ShopifyVariant[];

  image?: { src: string };

}



interface ShopifyVariant {

  id: number;

  sku?: string;

  price: string;

  inventory_quantity?: number;

}



interface ShopifyOrder {

  id: number;

  order_number: number;

  email?: string;

  customer?: {

    first_name?: string;

    last_name?: string;

  };

  total_price: string;

  currency: string;

  financial_status?: string;

  created_at: string;

  line_items: ShopifyLineItem[];

}



interface ShopifyLineItem {

  product_id?: number;

  variant_id?: number;

  quantity: number;

  price: string;

  title: string;

}


