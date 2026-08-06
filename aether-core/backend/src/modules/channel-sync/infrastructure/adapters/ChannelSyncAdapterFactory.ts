import type {
  ChannelSyncPortFactory,
  ChannelConfigResolver,
} from '../../application/ports/ChannelSyncPortFactory';
import type { ChannelProvider } from '../../domain/types';
import type { ChannelSyncPort } from '../../application/ports/ChannelSyncPort';
import { ShopifyChannelAdapter } from './ShopifyChannelAdapter';
import { WooCommerceChannelAdapter } from './WooCommerceChannelAdapter';

export class ChannelSyncAdapterFactory implements ChannelSyncPortFactory {
  create(provider: ChannelProvider, getConfig: ChannelConfigResolver): ChannelSyncPort {
    switch (provider) {
      case 'shopify':
        return new ShopifyChannelAdapter(getConfig);
      case 'woocommerce':
        return new WooCommerceChannelAdapter(getConfig);
      default:
        throw new Error(`Unsupported channel provider: ${provider}`);
    }
  }
}

export const channelSyncAdapterFactory = new ChannelSyncAdapterFactory();
