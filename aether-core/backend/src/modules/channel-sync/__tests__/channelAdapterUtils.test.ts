import { aggregateOrderMetrics, normalizeShopifyHost } from '../infrastructure/adapters/channelAdapterUtils';

describe('channelAdapterUtils', () => {
  describe('normalizeShopifyHost', () => {
    it('strips protocol and trailing slash', () => {
      expect(normalizeShopifyHost('https://demo.myshopify.com/')).toBe('demo.myshopify.com');
    });

    it('appends myshopify.com for bare shop name', () => {
      expect(normalizeShopifyHost('demo')).toBe('demo.myshopify.com');
    });
  });

  describe('aggregateOrderMetrics', () => {
    it('filters orders by date range and sums revenue', () => {
      const start = new Date('2024-01-01T00:00:00Z');
      const end = new Date('2024-01-31T23:59:59Z');
      const metrics = aggregateOrderMetrics(
        [
          {
            externalId: '1',
            customerEmail: 'a@test.com',
            total: 100,
            currency: 'EUR',
            status: 'paid',
            items: [],
            createdAt: new Date('2024-01-15T12:00:00Z'),
          },
          {
            externalId: '2',
            customerEmail: 'b@test.com',
            total: 50,
            currency: 'EUR',
            status: 'paid',
            items: [],
            createdAt: new Date('2023-12-01T12:00:00Z'),
          },
        ],
        start,
        end
      );

      expect(metrics.totalOrders).toBe(1);
      expect(metrics.totalRevenue).toBe(100);
      expect(metrics.currency).toBe('EUR');
    });
  });
});
