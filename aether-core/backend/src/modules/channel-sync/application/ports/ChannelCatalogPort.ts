import type { ChannelOrder, ChannelProduct, ChannelProvider } from '../../domain/types';

export interface UpsertChannelProductInput {
  tenantId: string;
  connectionId: string;
  provider: ChannelProvider;
  product: ChannelProduct;
}

export interface UpsertChannelOrderInput {
  tenantId: string;
  connectionId: string;
  provider: ChannelProvider;
  order: ChannelOrder;
}

export interface ChannelCatalogPort {
  upsertProduct(input: UpsertChannelProductInput): Promise<{ nativeId: string; created: boolean }>;
  upsertOrder(input: UpsertChannelOrderInput): Promise<{ nativeId: string; created: boolean }>;
}

export interface ChannelSyncLogPort {
  log(entry: {
    connectionId: string;
    tenantId: string;
    syncType: string;
    status: string;
    itemsCount: number;
    errorMessage?: string;
  }): Promise<void>;
}
