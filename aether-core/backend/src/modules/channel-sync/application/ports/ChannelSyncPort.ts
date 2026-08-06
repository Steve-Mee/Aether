import type {
  ChannelProduct,
  ChannelOrder,
  ChannelInventoryUpdate,
  ChannelMetrics,
  ChannelSyncResult,
} from '../../domain/types';

export interface ChannelSyncPort {
  getProducts(params: {
    tenantId: string;
    limit?: number;
    offset?: number;
  }): Promise<ChannelSyncResult<ChannelProduct[]>>;

  getOrders(params: {
    tenantId: string;
    since?: Date;
    limit?: number;
  }): Promise<ChannelSyncResult<ChannelOrder[]>>;

  pushInventoryUpdate(params: {
    tenantId: string;
    updates: ChannelInventoryUpdate[];
  }): Promise<ChannelSyncResult<{ updated: number }>>;

  getMetrics(params: {
    tenantId: string;
    start: Date;
    end: Date;
  }): Promise<ChannelSyncResult<ChannelMetrics>>;

  testConnection(tenantId: string): Promise<ChannelSyncResult<{ connected: boolean }>>;
}

export interface ChannelOAuthPort {
  getAuthUrl(params: {
    tenantId: string;
    redirectUri: string;
    storeUrl?: string;
  }): Promise<string>;

  exchangeCodeForToken(params: {
    tenantId: string;
    code: string;
    redirectUri: string;
  }): Promise<
    ChannelSyncResult<{
      accessToken: string;
      refreshToken?: string;
      expiresAt?: Date;
    }>
  >;

  refreshAccessToken(params: {
    tenantId: string;
    refreshToken: string;
  }): Promise<
    ChannelSyncResult<{
      accessToken: string;
      expiresAt?: Date;
    }>
  >;
}
