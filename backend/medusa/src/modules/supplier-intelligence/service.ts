import { MedusaService } from "@medusajs/utils";
import { SupplierConfig } from "./models/supplier-config";
import { SupplierCrawler } from "./crawler/supplier-crawler";

export default class SupplierIntelligenceService extends MedusaService({
  SupplierConfig,
}) {
  private crawler: SupplierCrawler;

  constructor(container: any) {
    super(container);
    this.crawler = new SupplierCrawler(container);
  }

  async syncSupplier(supplierId: string): Promise<any> {
    const config = await this.retrieve(supplierId);
    if (!config) throw new Error("Supplier config not found");

    const results = await this.crawler.crawl(config);

    // Map to Medusa products
    const productService = this.container.resolve("productService");
    for (const item of results.products) {
      // Create or update product (simplified)
      await productService.create({
        title: item.title,
        variants: item.variants,
        // ... map price, inventory etc.
      });
    }

    return { synced: results.products.length, changes: results.changes };
  }

  async addSupplierConfig(config: any) {
    return this.create(config);
  }
}