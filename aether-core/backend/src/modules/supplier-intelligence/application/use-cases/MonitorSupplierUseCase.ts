import { SupplierRepository } from '../../domain/repositories/SupplierRepository';
import { WebScraperService } from '../services/WebScraperService';
import { PriceChangeDetectorService } from '../services/PriceChangeDetectorService';

export class MonitorSupplierUseCase {
  constructor(
    private supplierRepository: SupplierRepository,
    private scraper: WebScraperService,
    private detector: PriceChangeDetectorService
  ) {}

  async execute(supplierId: string): Promise<any> {
    const supplier = await this.supplierRepository.findById(supplierId);
    if (!supplier) throw new Error('Supplier not found');

    // Scrape supplier website
    const scrapedProducts = await this.scraper.scrape(supplier.website);

    // Compare with existing products
    const existingProducts = await this.supplierRepository.findProductsBySupplier(supplierId);
    const changes = this.detector.detectChanges(existingProducts, scrapedProducts);

    // Save new/changed products
    for (const product of scrapedProducts) {
      await this.supplierRepository.saveProduct(product);
    }

    return {
      supplier: supplier.name,
      productsFound: scrapedProducts.length,
      changes: changes,
    };
  }
}