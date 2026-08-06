import type {
  ChannelConnection,
  ChannelConnectionRepository,
} from '../../domain/repositories/ChannelConnectionRepository';
import type { ChannelProvider, ChannelConnectionConfig } from '../../domain/types';
import type { ChannelSyncPort } from '../ports/ChannelSyncPort';
import type {
  ChannelSyncPortFactory,
  ChannelConfigResolver,
} from '../ports/ChannelSyncPortFactory';

export class ChannelConnectionService {
  constructor(
    private repository: ChannelConnectionRepository,
    private adapterFactory: ChannelSyncPortFactory
  ) {}

  async listConnections(tenantId: string): Promise<ChannelConnection[]> {
    return this.repository.findByTenant(tenantId);
  }

  async getConnection(id: string, tenantId: string): Promise<ChannelConnection | null> {
    return this.repository.findById(id, tenantId);
  }

  async createConnection(params: {
    tenantId: string;
    provider: ChannelProvider;
    displayName: string;
    config: ChannelConnectionConfig;
  }): Promise<ChannelConnection> {
    const connection = await this.repository.create({
      tenantId: params.tenantId,
      provider: params.provider,
      displayName: params.displayName,
      storeUrl: params.config.storeUrl,
      config: params.config,
      enabled: true,
    });

    return connection;
  }

  async updateConnection(
    id: string,
    tenantId: string,
    updates: Partial<{
      displayName: string;
      enabled: boolean;
      config: Partial<ChannelConnectionConfig>;
    }>
  ): Promise<ChannelConnection> {
    return this.repository.update(id, tenantId, updates as Parameters<ChannelConnectionRepository['update']>[2]);
  }

  async deleteConnection(id: string, tenantId: string): Promise<void> {
    await this.repository.delete(id, tenantId);
  }

  async testConnection(id: string, tenantId: string): Promise<{ connected: boolean; error?: string }> {
    const connection = await this.repository.findById(id, tenantId);
    if (!connection) {
      return { connected: false, error: 'Connection not found' };
    }

    const adapter = this.getAdapter(connection.provider, async (tid) => {
      if (tid !== tenantId) return null;
      return connection.config;
    });

    const result = await adapter.testConnection(tenantId);
    return {
      connected: result.success && result.data?.connected === true,
      error: result.error,
    };
  }

  getAdapter(provider: ChannelProvider, getConfig: ChannelConfigResolver): ChannelSyncPort {
    return this.adapterFactory.create(provider, getConfig);
  }

  async getAdapterForTenant(
    tenantId: string,
    provider: ChannelProvider
  ): Promise<ChannelSyncPort | null> {
    const connection = await this.repository.findByProvider(tenantId, provider);
    if (!connection || !connection.enabled) {
      return null;
    }

    return this.getAdapter(provider, async (tid) => {
      if (tid !== tenantId) return null;
      return connection.config;
    });
  }
}
