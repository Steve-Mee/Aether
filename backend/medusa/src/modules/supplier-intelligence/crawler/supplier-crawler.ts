export class SupplierCrawler {
  constructor(private container: any) {}

  async crawl(config: any) {
    // In productie: roep Python microservice aan via HTTP of message queue
    // Voor nu: stub die simuleert
    console.log(`[SupplierCrawler] Crawling ${config.domain}...`);

    return {
      products: [
        {
          title: "Example Product from Supplier",
          variants: [{ title: "Default", prices: [{ amount: 2999, currency_code: "EUR" }] }],
          stock: 42,
        },
      ],
      changes: { price_changes: 2, new_products: 1 },
    };
  }
}