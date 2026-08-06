import type { ChannelProvider, ChannelConnectionConfig } from '../../domain/types';
import type { ChannelSyncPort } from './ChannelSyncPort';

export type ChannelConfigResolver = (tenantId: string) => Promise<ChannelConnectionConfig | null>;

export interface ChannelSyncPortFactory {
  create(provider: ChannelProvider, getConfig: ChannelConfigResolver): ChannelSyncPort;
}
