import { PrismaClient } from '@prisma/client';
import type {
  ChannelConnection,
  ChannelConnectionRepository,
} from '../../domain/repositories/ChannelConnectionRepository';
import type { ChannelProvider } from '../../domain/types';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import {
  decryptCredentialPayload,
  encryptCredentialPayload,
} from '../../../../shared/security/credentialEncryption';

export class PrismaChannelConnectionRepository implements ChannelConnectionRepository {
  constructor(private prisma: PrismaClient) {}

  async findByTenant(tenantId: string): Promise<ChannelConnection[]> {
    const tid = requireTenantId(tenantId, 'PrismaChannelConnectionRepository.findByTenant');
    const connections = await this.prisma.channelConnection.findMany({
      where: { tenantId: tid },
      orderBy: { createdAt: 'desc' },
    });
    return connections.map((c) => this.toDomain(c));
  }

  async findById(id: string, tenantId: string): Promise<ChannelConnection | null> {
    const tid = requireTenantId(tenantId, 'PrismaChannelConnectionRepository.findById');
    const connection = await this.prisma.channelConnection.findFirst({
      where: { id, tenantId: tid },
    });
    return connection ? this.toDomain(connection) : null;
  }

  async findByProvider(
    tenantId: string,
    provider: ChannelProvider
  ): Promise<ChannelConnection | null> {
    const tid = requireTenantId(tenantId, 'PrismaChannelConnectionRepository.findByProvider');
    const connection = await this.prisma.channelConnection.findFirst({
      where: { tenantId: tid, provider, enabled: true },
    });
    return connection ? this.toDomain(connection) : null;
  }

  async create(
    connection: Omit<ChannelConnection, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ChannelConnection> {
    const tid = requireTenantId(connection.tenantId, 'PrismaChannelConnectionRepository.create');

    const credentialsEnc = encryptCredentialPayload(
      JSON.stringify(connection.config.credentials)
    );

    const created = await this.prisma.channelConnection.create({
      data: {
        tenantId: tid,
        provider: connection.provider,
        displayName: connection.displayName,
        storeUrl: connection.storeUrl,
        credentialsEnc,
        webhookSecret: connection.config.webhookSecret,
        syncProducts: connection.config.syncOptions?.syncProducts ?? true,
        syncOrders: connection.config.syncOptions?.syncOrders ?? true,
        syncInventory: connection.config.syncOptions?.syncInventory ?? false,
        syncInterval: connection.config.syncOptions?.syncInterval ?? 3600,
        enabled: connection.enabled,
        lastSyncAt: connection.lastSyncAt,
        lastSyncStatus: connection.lastSyncStatus,
      },
    });

    return this.toDomain(created);
  }

  async update(
    id: string,
    tenantId: string,
    data: Partial<Omit<ChannelConnection, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>
  ): Promise<ChannelConnection> {
    const tid = requireTenantId(tenantId, 'PrismaChannelConnectionRepository.update');

    const updateData: Record<string, unknown> = {};

    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.storeUrl !== undefined) updateData.storeUrl = data.storeUrl;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.lastSyncAt !== undefined) updateData.lastSyncAt = data.lastSyncAt;
    if (data.lastSyncStatus !== undefined) updateData.lastSyncStatus = data.lastSyncStatus;

    if (data.config?.credentials) {
      updateData.credentialsEnc = encryptCredentialPayload(
        JSON.stringify(data.config.credentials)
      );
    }

    if (data.config?.webhookSecret !== undefined) {
      updateData.webhookSecret = data.config.webhookSecret;
    }

    if (data.config?.syncOptions) {
      if (data.config.syncOptions.syncProducts !== undefined)
        updateData.syncProducts = data.config.syncOptions.syncProducts;
      if (data.config.syncOptions.syncOrders !== undefined)
        updateData.syncOrders = data.config.syncOptions.syncOrders;
      if (data.config.syncOptions.syncInventory !== undefined)
        updateData.syncInventory = data.config.syncOptions.syncInventory;
      if (data.config.syncOptions.syncInterval !== undefined)
        updateData.syncInterval = data.config.syncOptions.syncInterval;
    }

    const updated = await this.prisma.channelConnection.update({
      where: { id, tenantId: tid },
      data: updateData,
    });

    return this.toDomain(updated);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const tid = requireTenantId(tenantId, 'PrismaChannelConnectionRepository.delete');
    await this.prisma.channelConnection.delete({
      where: { id, tenantId: tid },
    });
  }

  private toDomain(row: {
    id: string;
    tenantId: string;
    provider: string;
    displayName: string;
    storeUrl: string;
    credentialsEnc: string;
    webhookSecret: string | null;
    syncProducts: boolean;
    syncOrders: boolean;
    syncInventory: boolean;
    syncInterval: number;
    lastSyncAt: Date | null;
    lastSyncStatus: string | null;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ChannelConnection {
    const credentialsJson = decryptCredentialPayload(row.credentialsEnc);
    const credentials = JSON.parse(credentialsJson) as Record<string, unknown>;

    return {
      id: row.id,
      tenantId: row.tenantId,
      provider: row.provider as ChannelProvider,
      displayName: row.displayName,
      storeUrl: row.storeUrl,
      config: {
        provider: row.provider as ChannelProvider,
        storeUrl: row.storeUrl,
        credentials,
        webhookSecret: row.webhookSecret ?? undefined,
        syncOptions: {
          syncProducts: row.syncProducts,
          syncOrders: row.syncOrders,
          syncInventory: row.syncInventory,
          syncInterval: row.syncInterval,
          lastSyncAt: row.lastSyncAt ?? undefined,
        },
      },
      enabled: row.enabled,
      lastSyncAt: row.lastSyncAt ?? undefined,
      lastSyncStatus: row.lastSyncStatus ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
