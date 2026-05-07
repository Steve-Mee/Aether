import { SupplierProduct } from '../../domain/entities/SupplierProduct';

export class PriceChangeDetectorService {
  detectChanges(
    existing: SupplierProduct[],
    scraped: SupplierProduct[]
  ): any[] {
    const changes: any[] = [];

    for (const scrapedProduct of scraped) {
      const existingProduct = existing.find(p => p.sku === scrapedProduct.sku);

      if (!existingProduct) {
        changes.push({
          type: 'new_product',
          sku: scrapedProduct.sku,
          name: scrapedProduct.name,
          price: scrapedProduct.currentPrice,
        });
      } else if (existingProduct.currentPrice !== scrapedProduct.currentPrice) {
        changes.push({
          type: 'price_change',
          sku: scrapedProduct.sku,
          name: scrapedProduct.name,
          oldPrice: existingProduct.currentPrice,
          newPrice: scrapedProduct.currentPrice,
          change: ((scrapedProduct.currentPrice - existingProduct.currentPrice) / existingProduct.currentPrice * 100).toFixed(1) + '%',
        });
      }
    }

    return changes;
  }
}