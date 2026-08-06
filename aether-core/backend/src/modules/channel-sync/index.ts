export { ChannelConnectionService } from './application/services/ChannelConnectionService';
export { PrismaChannelConnectionRepository } from './infrastructure/persistence/PrismaChannelConnectionRepository';
export { ShopifyChannelAdapter } from './infrastructure/adapters/ShopifyChannelAdapter';
export { WooCommerceChannelAdapter } from './infrastructure/adapters/WooCommerceChannelAdapter';
export type { ChannelSyncPort, ChannelOAuthPort } from './application/ports/ChannelSyncPort';
export type {
  ChannelProduct,
  ChannelOrder,
  ChannelInventoryUpdate,
  ChannelMetrics,
  ChannelSyncResult,
  ChannelProvider,
  ChannelConnectionConfig,
} from './domain/types';
export type {
  ChannelConnection,
  ChannelConnectionRepository,
} from './domain/repositories/ChannelConnectionRepository';
export { default } from './api/channelConnectionRoutes';
export { default as channelSyncSettingsRouter } from './api/channelSyncSettingsRoutes';
export { SyncConnectionUseCase } from './application/use-cases/SyncConnectionUseCase';
