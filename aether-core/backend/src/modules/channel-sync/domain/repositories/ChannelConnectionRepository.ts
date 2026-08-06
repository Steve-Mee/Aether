import type { ChannelConnectionConfig, ChannelProvider } from '../types';

export interface ChannelConnection {
  id: string;
  tenantId: string;
  provider: ChannelProvider;
  displayName: string;
  storeUrl: string;
  config: ChannelConnectionConfig;
  enabled: boolean;
  lastSyncAt?: Date;
  lastSyncStatus?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelConnectionRepository {
  findByTenant(tenantId: string): Promise<ChannelConnection[]>;
  findById(id: string, tenantId: string): Promise<ChannelConnection | null>;
  findByProvider(
    tenantId: string,
    provider: ChannelProvider
  ): Promise<ChannelConnection | null>;
  create(connection: Omit<ChannelConnection, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChannelConnection>;
  update(
    id: string,
    tenantId: string,
    data: Partial<Omit<ChannelConnection, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>
  ): Promise<ChannelConnection>;
  delete(id: string, tenantId: string): Promise<void>;
}
