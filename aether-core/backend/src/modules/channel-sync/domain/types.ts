export interface ChannelProduct {
  externalId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  stock?: number;
  sku?: string;
  imageUrl?: string;
  variants?: ChannelProductVariant[];
  metadata?: Record<string, unknown>;
}

export interface ChannelProductVariant {
  externalId: string;
  sku: string;
  price: number;
  stock?: number;
  attributes?: Record<string, string>;
}

export interface ChannelOrder {
  externalId: string;
  orderNumber?: string;
  customerEmail: string;
  customerName?: string;
  total: number;
  currency: string;
  status: string;
  items: ChannelOrderItem[];
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface ChannelOrderItem {
  productExternalId: string;
  variantExternalId?: string;
  quantity: number;
  price: number;
  name: string;
}

export interface ChannelInventoryUpdate {
  productExternalId: string;
  variantExternalId?: string;
  quantity: number;
  warehouseId?: string;
}

export interface ChannelMetrics {
  totalOrders: number;
  totalRevenue: number;
  currency: string;
  period: { start: Date; end: Date };
}

export interface ChannelSyncResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  syncedAt: Date;
}

export type ChannelProvider = 'shopify' | 'woocommerce';

export interface ChannelConnectionConfig {
  provider: ChannelProvider;
  storeUrl: string;
  credentials: ChannelCredentials;
  webhookSecret?: string;
  syncOptions?: ChannelSyncOptions;
}

export interface ChannelCredentials {
  accessToken?: string;
  apiKey?: string;
  apiSecret?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface ChannelSyncOptions {
  syncProducts?: boolean;
  syncOrders?: boolean;
  syncInventory?: boolean;
  syncInterval?: number;
  lastSyncAt?: Date;
}
