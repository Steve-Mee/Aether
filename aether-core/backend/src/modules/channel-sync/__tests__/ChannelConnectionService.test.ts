import { ChannelConnectionService } from '../application/services/ChannelConnectionService';
import type {
  ChannelConnection,
  ChannelConnectionRepository,
} from '../domain/repositories/ChannelConnectionRepository';
import type { ChannelProvider, ChannelConnectionConfig } from '../domain/types';
import { channelSyncAdapterFactory } from '../infrastructure/adapters/ChannelSyncAdapterFactory';

describe('ChannelConnectionService', () => {
  let service: ChannelConnectionService;
  let mockRepository: jest.Mocked<ChannelConnectionRepository>;

  beforeEach(() => {
    mockRepository = {
      findByTenant: jest.fn(),
      findById: jest.fn(),
      findByProvider: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<ChannelConnectionRepository>;

    service = new ChannelConnectionService(mockRepository, channelSyncAdapterFactory);
  });

  describe('listConnections', () => {
    it('returns all connections for a tenant', async () => {
      const mockConnections: ChannelConnection[] = [
        {
          id: '1',
          tenantId: 'test-tenant',
          provider: 'shopify',
          displayName: 'My Shopify Store',
          storeUrl: 'https://test.myshopify.com',
          config: {
            provider: 'shopify',
            storeUrl: 'https://test.myshopify.com',
            credentials: { accessToken: 'test' },
          },
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.findByTenant.mockResolvedValue(mockConnections);

      const result = await service.listConnections('test-tenant');
      expect(result).toEqual(mockConnections);
      expect(mockRepository.findByTenant).toHaveBeenCalledWith('test-tenant');
    });
  });

  describe('createConnection', () => {
    it('creates a new channel connection', async () => {
      const config: ChannelConnectionConfig = {
        provider: 'shopify',
        storeUrl: 'https://test.myshopify.com',
        credentials: { accessToken: 'test-token' },
      };

      const mockConnection: ChannelConnection = {
        id: '1',
        tenantId: 'test-tenant',
        provider: 'shopify',
        displayName: 'My Shopify Store',
        storeUrl: 'https://test.myshopify.com',
        config,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValue(mockConnection);

      const result = await service.createConnection({
        tenantId: 'test-tenant',
        provider: 'shopify',
        displayName: 'My Shopify Store',
        config,
      });

      expect(result).toEqual(mockConnection);
      expect(mockRepository.create).toHaveBeenCalledWith({
        tenantId: 'test-tenant',
        provider: 'shopify',
        displayName: 'My Shopify Store',
        storeUrl: 'https://test.myshopify.com',
        config,
        enabled: true,
      });
    });
  });

  describe('getAdapter', () => {
    it('returns Shopify adapter for shopify provider', () => {
      const adapter = service.getAdapter('shopify', async () => null);
      expect(adapter).toBeDefined();
    });

    it('returns WooCommerce adapter for woocommerce provider', () => {
      const adapter = service.getAdapter('woocommerce', async () => null);
      expect(adapter).toBeDefined();
    });

    it('throws error for unsupported provider', () => {
      expect(() => {
        service.getAdapter('unsupported' as ChannelProvider, async () => null);
      }).toThrow('Unsupported channel provider: unsupported');
    });
  });

  describe('updateConnection', () => {
    it('updates connection settings', async () => {
      const updated: ChannelConnection = {
        id: '1',
        tenantId: 'test-tenant',
        provider: 'shopify',
        displayName: 'Updated Store Name',
        storeUrl: 'https://test.myshopify.com',
        config: {
          provider: 'shopify',
          storeUrl: 'https://test.myshopify.com',
          credentials: {},
        },
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.update.mockResolvedValue(updated);

      const result = await service.updateConnection('1', 'test-tenant', {
        displayName: 'Updated Store Name',
        enabled: false,
      });

      expect(result.displayName).toBe('Updated Store Name');
      expect(result.enabled).toBe(false);
    });
  });

  describe('deleteConnection', () => {
    it('deletes a connection', async () => {
      mockRepository.delete.mockResolvedValue();

      await service.deleteConnection('1', 'test-tenant');

      expect(mockRepository.delete).toHaveBeenCalledWith('1', 'test-tenant');
    });
  });
});
