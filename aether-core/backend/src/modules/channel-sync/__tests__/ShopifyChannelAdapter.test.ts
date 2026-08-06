import { ShopifyChannelAdapter } from '../infrastructure/adapters/ShopifyChannelAdapter';

import type { ChannelConnectionConfig } from '../domain/types';



describe('ShopifyChannelAdapter', () => {

  let adapter: ShopifyChannelAdapter;

  let mockGetConfig: jest.Mock;



  beforeEach(() => {

    mockGetConfig = jest.fn();

    adapter = new ShopifyChannelAdapter(mockGetConfig);

    delete process.env.SHOPIFY_CLIENT_ID;

    delete process.env.SHOPIFY_CLIENT_SECRET;

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

        provider: 'shopify',

        storeUrl: 'https://invalid.myshopify.com',

        credentials: { accessToken: 'invalid' },

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



    it('validates limit and offset parameters', async () => {

      const config: ChannelConnectionConfig = {

        provider: 'shopify',

        storeUrl: 'https://test.myshopify.com',

        credentials: { accessToken: 'test' },

      };



      mockGetConfig.mockResolvedValue(config);



      await adapter.getProducts({

        tenantId: 'test-tenant',

        limit: 25,

        offset: 50,

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

  });



  describe('pushInventoryUpdate', () => {

    it('requires variantExternalId for Shopify updates', async () => {

      const config: ChannelConnectionConfig = {

        provider: 'shopify',

        storeUrl: 'https://test.myshopify.com',

        credentials: { accessToken: 'test' },

      };



      mockGetConfig.mockResolvedValue(config);



      const result = await adapter.pushInventoryUpdate({

        tenantId: 'test-tenant',

        updates: [{ productExternalId: '1', quantity: 5 }],

      });



      expect(result.success).toBe(false);

      expect(result.error).toContain('variantExternalId');

    });



    it('returns success for empty updates', async () => {

      const config: ChannelConnectionConfig = {

        provider: 'shopify',

        storeUrl: 'https://test.myshopify.com',

        credentials: { accessToken: 'test' },

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

    it('returns error when orders fetch fails', async () => {

      mockGetConfig.mockResolvedValue(null);



      const result = await adapter.getMetrics({

        tenantId: 'test-tenant',

        start: new Date(),

        end: new Date(),

      });



      expect(result.success).toBe(false);

    });

  });



  describe('OAuth', () => {

    it('getAuthUrl uses connection store URL', async () => {

      process.env.SHOPIFY_CLIENT_ID = 'test-client';

      const config: ChannelConnectionConfig = {

        provider: 'shopify',

        storeUrl: 'https://real-shop.myshopify.com',

        credentials: {},

      };

      mockGetConfig.mockResolvedValue(config);



      const url = await adapter.getAuthUrl({

        tenantId: 'test-tenant',

        redirectUri: 'https://app.aether.com/callback',

      });



      expect(url).toContain('real-shop.myshopify.com/admin/oauth/authorize');

      expect(url).not.toContain('YOUR_SHOP');

      expect(url).toContain('redirect_uri=');

      expect(url).toContain('state=');

    });



    it('exchangeCodeForToken fails without client secret', async () => {

      process.env.SHOPIFY_CLIENT_ID = 'test-client';

      mockGetConfig.mockResolvedValue({

        provider: 'shopify',

        storeUrl: 'https://test.myshopify.com',

        credentials: {},

      });



      const result = await adapter.exchangeCodeForToken({

        tenantId: 'test-tenant',

        code: 'test-code',

        redirectUri: 'https://app.aether.com/callback',

      });



      expect(result.success).toBe(false);

      expect(result.error).toContain('SHOPIFY_CLIENT_SECRET');

    });

  });

});


