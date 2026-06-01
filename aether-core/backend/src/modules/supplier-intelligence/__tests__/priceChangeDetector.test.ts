import { PriceChangeDetectorService } from '../application/services/PriceChangeDetectorService';
import { SupplierProduct } from '../domain/entities/SupplierProduct';

describe('PriceChangeDetectorService (module)', () => {
  const detector = new PriceChangeDetectorService();

  it('detects price change above threshold', () => {
    const existing = [
      new SupplierProduct('1', 's1', 'Widget', 'SKU-1', 100, 'EUR', 5, new Date()),
    ];
    const scraped = [
      new SupplierProduct('2', 's1', 'Widget', 'SKU-1', 120, 'EUR', 5, new Date()),
    ];
    const changes = detector.detectChanges(existing, scraped);
    expect(changes.some((c) => c.type === 'price_change')).toBe(true);
  });
});
