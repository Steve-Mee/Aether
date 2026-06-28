/** Hard denylist — fields that must never appear in bilateral packages. */
export const BILATERAL_FORBIDDEN_FIELDS = new Set([
  'sku',
  'product_name',
  'supplier_name',
  'customer_id',
  'customer_email',
  'email',
  'price',
  'absolute_price',
  'iban',
  'order_id',
  'tenant_id',
  'merchant_name',
]);

export const BILATERAL_SCHEMA_DEFINITIONS = [
  {
    schemaKey: 'inventory_turnover_band',
    fields: ['product_count_band', 'low_stock_ratio', 'turnover_index'],
    description: 'Aggregated inventory turnover bands',
  },
  {
    schemaKey: 'promo_uplift_aggregate',
    fields: ['promo_uplift_rate', 'sample_size'],
    description: 'Promo uplift aggregate metrics',
  },
  {
    schemaKey: 'supplier_category_mix',
    fields: ['category_count', 'top_category_share'],
    description: 'Supplier category mix aggregates',
  },
] as const;
