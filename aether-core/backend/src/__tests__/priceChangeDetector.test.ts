import { PriceChangeDetectorService } from '../modules/supplier-intelligence/application/services/PriceChangeDetectorService';

describe('PriceChangeDetectorService', () => {
  it('detects price changes', () => {
    const detector = new PriceChangeDetectorService();
    const changes = detector.detectChanges(
      [
        {
          id: '1',
          supplierId: 's1',
          name: 'Hoodie',
          sku: 'H-1',
          currentPrice: 80,
          currency: 'EUR',
          stockLevel: 10,
          lastChecked: new Date(),
        },
      ],
      [
        {
          id: '2',
          supplierId: 's1',
          name: 'Hoodie',
          sku: 'H-1',
          currentPrice: 90,
          currency: 'EUR',
          stockLevel: 10,
          lastChecked: new Date(),
        },
      ]
    );
    expect(changes.some((c) => c.type === 'price_change')).toBe(true);
  });
});
