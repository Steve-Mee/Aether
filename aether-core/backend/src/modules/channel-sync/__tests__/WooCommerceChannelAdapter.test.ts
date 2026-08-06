import { WooCommerceChannelAdapter } from '../infrastructure/adapters/WooCommerceChannelAdapter';

import type { ChannelConnectionConfig } from '../domain/types';



describe('WooCommerceChannelAdapter', () => {

  let adapter: WooCommerceChannelAdapter;

  let mockGetConfig: jest.Mock;



  beforeEach(() => {

    mockGetConfig = jest.fn();

    adapter = new WooCommerceChannelAdapter(mockGetConfig);

  });



  describe('testConnection', () => {

    it('returns error when config not found', async () => {

      mockGetConfig.mockResolvedValue(null);



      const result = await adapter.testConnection('test-tenant');



      expect(result.success).toBe(false);

      expect(result.error).toBe('Channel not configured');

    });



    it('returns connected:false when connection fails', async () => {

      const config: ChannelConnectionConfig = {

        provider: 'woocommerce',

        storeUrl: 'https://invalid-woocommerce.com',

        credentials: { apiKey: 'test', apiSecret: 'test' },

      };



      mockGetConfig.mockResolvedValue(config);



      const result = await adapter.testConnection('test-tenant');



      expect(result.success).toBe(false);

      expect(result.data?.connected).toBe(false);

    });

  });



  describe('getProducts', () => {

    it('returns error when config not found', async () => {

      mockGetConfig.mockResolvedValue(null);



      const result = await adapter.getProducts({

        tenantId: 'test-tenant',

        limit: 10,

      });



      expect(result.success).toBe(false);

      expect(result.error).toBe('Channel not configured');

    });



    it('handles pagination with offset parameter', async () => {

      const config: ChannelConnectionConfig = {

        provider: 'woocommerce',

        storeUrl: 'https://test-woocommerce.com',

        credentials: { apiKey: 'test', apiSecret: 'test' },

      };



      mockGetConfig.mockResolvedValue(config);



      await adapter.getProducts({

        tenantId: 'test-tenant',

        limit: 20,

        offset: 40,

      });



      expect(mockGetConfig).toHaveBeenCalledWith('test-tenant');

    });

  });



  describe('getOrders', () => {

    it('returns error when config not found', async () => {

      mockGetConfig.mockResolvedValue(null);



      const result = await adapter.getOrders({

        tenantId: 'test-tenant',

      });



      expect(result.success).toBe(false);

      expect(result.error).toBe('Channel not configured');

    });



    it('supports since parameter for incremental sync', async () => {

      const config: ChannelConnectionConfig = {

        provider: 'woocommerce',

        storeUrl: 'https://test-woocommerce.com',

        credentials: { apiKey: 'test', apiSecret: 'test' },

      };



      mockGetConfig.mockResolvedValue(config);



      const since = new Date('2024-01-01');

      await adapter.getOrders({

        tenantId: 'test-tenant',

        since,

      });



      expect(mockGetConfig).toHaveBeenCalledWith('test-tenant');

    });

  });



  describe('pushInventoryUpdate', () => {

    it('requires API credentials', async () => {

      const config: ChannelConnectionConfig = {

        provider: 'woocommerce',

        storeUrl: 'https://test-woocommerce.com',

        credentials: {},

      };



      mockGetConfig.mockResolvedValue(config);



      const result = await adapter.pushInventoryUpdate({

        tenantId: 'test-tenant',

        updates: [{ productExternalId: '1', quantity: 2 }],

      });



      expect(result.success).toBe(false);

      expect(result.error).toContain('API key');

    });



    it('returns success for empty updates', async () => {

      const config: ChannelConnectionConfig = {

        provider: 'woocommerce',

        storeUrl: 'https://test-woocommerce.com',

        credentials: { apiKey: 'k', apiSecret: 's' },

      };



      mockGetConfig.mockResolvedValue(config);



      const result = await adapter.pushInventoryUpdate({

        tenantId: 'test-tenant',

        updates: [],

      });



      expect(result.success).toBe(true);

      expect(result.data?.updated).toBe(0);

    });

  });



  describe('getMetrics', () => {

    it('returns error when config not found', async () => {

      mockGetConfig.mockResolvedValue(null);



      const result = await adapter.getMetrics({

        tenantId: 'test-tenant',

        start: new Date(),

        end: new Date(),

      });



      expect(result.success).toBe(false);

    });

  });

});


