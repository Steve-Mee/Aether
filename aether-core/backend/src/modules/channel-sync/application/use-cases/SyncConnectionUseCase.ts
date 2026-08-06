import type { ChannelConnectionRepository } from '../../domain/repositories/ChannelConnectionRepository';
import type { ChannelCatalogPort, ChannelSyncLogPort } from '../ports/ChannelCatalogPort';
import { ChannelConnectionService } from '../services/ChannelConnectionService';

export interface SyncConnectionResult {
  connectionId: string;
  productsSynced: number;
  ordersSynced: number;
  status: 'success' | 'partial' | 'failed';
  errors: string[];
  syncedAt: Date;
}

export class SyncConnectionUseCase {
  constructor(
    private repository: ChannelConnectionRepository,
    private connectionService: ChannelConnectionService,
    private catalogPort: ChannelCatalogPort,
    private syncLogPort: ChannelSyncLogPort
  ) {}

  async execute(connectionId: string, tenantId: string): Promise<SyncConnectionResult> {
    const connection = await this.repository.findById(connectionId, tenantId);
    if (!connection) {
      throw new Error('Connection not found');
    }
    if (!connection.enabled) {
      throw new Error('Connection is disabled');
    }

    const adapter = this.connectionService.getAdapter(connection.provider, async (tid) => {
      if (tid !== tenantId) return null;
      return connection.config;
    });

    const errors: string[] = [];
    let productsSynced = 0;
    let ordersSynced = 0;
    const syncProducts = connection.config.syncOptions?.syncProducts !== false;
    const syncOrders = connection.config.syncOptions?.syncOrders !== false;

    if (syncProducts) {
      const productsResult = await adapter.getProducts({ tenantId, limit: 250 });
      if (!productsResult.success || !productsResult.data) {
        errors.push(productsResult.error ?? 'Failed to fetch products');
      } else {
        for (const product of productsResult.data) {
          try {
            await this.catalogPort.upsertProduct({
              tenantId,
              connectionId,
              provider: connection.provider,
              product,
            });
            productsSynced++;
          } catch (err) {
            errors.push(
              `Product ${product.externalId}: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        }
      }
    }

    if (syncOrders) {
      const since = connection.config.syncOptions?.lastSyncAt ?? connection.lastSyncAt;
      const ordersResult = await adapter.getOrders({ tenantId, since, limit: 250 });
      if (!ordersResult.success || !ordersResult.data) {
        errors.push(ordersResult.error ?? 'Failed to fetch orders');
      } else {
        for (const order of ordersResult.data) {
          try {
            await this.catalogPort.upsertOrder({
              tenantId,
              connectionId,
              provider: connection.provider,
              order,
            });
            ordersSynced++;
          } catch (err) {
            errors.push(
              `Order ${order.externalId}: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        }
      }
    }

    const syncedAt = new Date();
    const status: SyncConnectionResult['status'] =
      errors.length === 0
        ? 'success'
        : productsSynced + ordersSynced > 0
          ? 'partial'
          : 'failed';

    await this.repository.update(connectionId, tenantId, {
      lastSyncAt: syncedAt,
      lastSyncStatus: status,
      config: {
        ...connection.config,
        syncOptions: {
          ...connection.config.syncOptions,
          lastSyncAt: syncedAt,
        },
      },
    });

    await this.syncLogPort.log({
      connectionId,
      tenantId,
      syncType: 'full',
      status,
      itemsCount: productsSynced + ordersSynced,
      errorMessage: errors.length ? errors.join('; ') : undefined,
    });

    return {
      connectionId,
      productsSynced,
      ordersSynced,
      status,
      errors,
      syncedAt,
    };
  }
}
