import { ChannelConnectionService } from './application/services/ChannelConnectionService';
import { SyncConnectionUseCase } from './application/use-cases/SyncConnectionUseCase';
import { channelSyncAdapterFactory } from './infrastructure/adapters/ChannelSyncAdapterFactory';
import { PrismaChannelConnectionRepository } from './infrastructure/persistence/PrismaChannelConnectionRepository';
import { PrismaChannelCatalogAdapter } from './infrastructure/persistence/PrismaChannelCatalogAdapter';
import { prisma } from '../../shared/prisma/client';

const repository = new PrismaChannelConnectionRepository(prisma);
const catalogAdapter = new PrismaChannelCatalogAdapter(prisma);

export const channelConnectionService = new ChannelConnectionService(
  repository,
  channelSyncAdapterFactory
);

export const syncConnectionUseCase = new SyncConnectionUseCase(
  repository,
  channelConnectionService,
  catalogAdapter,
  catalogAdapter
);
