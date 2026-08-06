import type { ChannelSyncPort } from '../../application/ports/ChannelSyncPort';
import type {
  ChannelProduct,
  ChannelOrder,
  ChannelInventoryUpdate,
  ChannelMetrics,
  ChannelSyncResult,
  ChannelConnectionConfig,
} from '../../domain/types';
import { aggregateOrderMetrics } from './channelAdapterUtils';

export class WooCommerceChannelAdapter implements ChannelSyncPort {
  constructor(private getConfig: (tenantId: string) => Promise<ChannelConnectionConfig | null>) {}

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
    const page = Math.floor((params.offset ?? 0) / limit) + 1;

    const auth = Buffer.from(
      `${config.credentials.apiKey}:${config.credentials.apiSecret}`
    ).toString('base64');

    try {
      const response = await fetch(
        `${config.storeUrl}/wp-json/wc/v3/products?per_page=${limit}&page=${page}`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `WooCommerce API error: ${response.status}`,
          syncedAt: new Date(),
        };
      }

      const data = (await response.json()) as WooCommerceProduct[];

      const products: ChannelProduct[] = data.map((p) => ({
        externalId: p.id.toString(),
        name: p.name,
        description: p.description,
        price: parseFloat(p.price ?? '0'),
        currency: 'EUR',
        stock: p.stock_quantity ?? 0,
        sku: p.sku,
        imageUrl: p.images?.[0]?.src,
        variants: p.variations && p.variations.length > 0 ? [] : undefined,
        metadata: {
          woocommerceSlug: p.slug,
          woocommerceType: p.type,
        },
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
    const sinceParam = params.since ? `&after=${params.since.toISOString()}` : '';

    const auth = Buffer.from(
      `${config.credentials.apiKey}:${config.credentials.apiSecret}`
    ).toString('base64');

    try {
      const response = await fetch(
        `${config.storeUrl}/wp-json/wc/v3/orders?per_page=${limit}${sinceParam}`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `WooCommerce API error: ${response.status}`,
          syncedAt: new Date(),
        };
      }

      const data = (await response.json()) as WooCommerceOrder[];

      const orders: ChannelOrder[] = data.map((o) => ({
        externalId: o.id.toString(),
        orderNumber: o.number,
        customerEmail: o.billing.email,
        customerName: `${o.billing.first_name} ${o.billing.last_name}`.trim(),
        total: parseFloat(o.total),
        currency: o.currency,
        status: o.status,
        items: o.line_items.map((item) => ({
          productExternalId: item.product_id.toString(),
          variantExternalId: item.variation_id ? item.variation_id.toString() : undefined,
          quantity: item.quantity,
          price: parseFloat(item.price),
          name: item.name,
        })),
        createdAt: new Date(o.date_created),
        metadata: { woocommerceOrderKey: o.order_key },
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

    if (!config.credentials.apiKey || !config.credentials.apiSecret) {
      return {
        success: false,
        error: 'WooCommerce API key and secret are required',
        syncedAt: new Date(),
      };
    }

    if (params.updates.length === 0) {
      return { success: true, data: { updated: 0 }, syncedAt: new Date() };
    }

    const auth = Buffer.from(
      `${config.credentials.apiKey}:${config.credentials.apiSecret}`
    ).toString('base64');

    let updated = 0;
    const errors: string[] = [];

    for (const update of params.updates) {
      const url = update.variantExternalId
        ? `${config.storeUrl}/wp-json/wc/v3/products/${update.productExternalId}/variations/${update.variantExternalId}`
        : `${config.storeUrl}/wp-json/wc/v3/products/${update.productExternalId}`;

      try {
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            stock_quantity: update.quantity,
            manage_stock: true,
          }),
        });

        if (!response.ok) {
          errors.push(`Product ${update.productExternalId}: WooCommerce API ${response.status}`);
          continue;
        }
        updated++;
      } catch (err) {
        errors.push(
          `Product ${update.productExternalId}: ${err instanceof Error ? err.message : String(err)}`
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

    const auth = Buffer.from(
      `${config.credentials.apiKey}:${config.credentials.apiSecret}`
    ).toString('base64');

    try {
      const response = await fetch(`${config.storeUrl}/wp-json/wc/v3/system_status`, {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: response.ok,
        data: { connected: response.ok },
        syncedAt: new Date(),
      };
    } catch {
      return {
        success: false,
        data: { connected: false },
        syncedAt: new Date(),
      };
    }
  }
}

interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  type: string;
  description: string;
  short_description?: string;
  sku: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  stock_quantity?: number;
  images?: Array<{ src: string }>;
  variations?: number[];
}

interface WooCommerceOrder {
  id: number;
  number: string;
  order_key: string;
  status: string;
  currency: string;
  date_created: string;
  total: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
  };
  line_items: WooCommerceLineItem[];
}

interface WooCommerceLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id?: number;
  quantity: number;
  price: string;
}
