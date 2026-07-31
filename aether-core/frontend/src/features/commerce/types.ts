export interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  status: string;
  price: number;
  stock: number;
  seoTitle: string | null;
  seoDescription: string | null;
  categoryId: string | null;
  variants: ProductVariant[];
  media: ProductMediaItem[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  price: number;
  currency: string;
  stock: number;
}

export interface ProductMediaItem {
  id: string;
  mediaAssetId: string;
  url: string;
  mimeType: string;
  alt: string | null;
  sortOrder: number;
}

export interface OrderDetail {
  id: string;
  customerId: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  items: Array<{ id: string; productId: string; quantity: number; price: number }>;
  customer: { id: string; email: string; name: string } | null;
  shipments: Array<{
    id: string;
    status: string;
    carrier: string | null;
    trackingNumber: string | null;
    shippedAt: string | null;
  }>;
  refunds: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    reason: string | null;
  }>;
  payment: { id: string; status: string; amount: number; paymentMethod: string } | null;
}

export interface CustomerRow {
  id: string;
  email: string;
  name: string;
  segment: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt?: string | null;
}

export interface CustomerDetail extends CustomerRow {
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  churnRisk: boolean;
  daysSinceLastOrder: number | null;
}

export interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  productName: string | null;
  productSlug: string | null;
  threshold: number;
  status: 'ok' | 'low';
}

export interface PromotionRow {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  value: number;
  status: string;
  code?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface PaymentsSummary {
  status: 'partial' | string;
  provider: string;
  connectConfigured: boolean;
  paymentCount: number;
  byStatus: {
    pending: number;
    paid: number;
    failed: number;
    refunded: number;
  };
  paidAmount: number;
  failedCount: number;
  currency: string;
}

export interface PaymentsPayoutsResponse {
  status: 'partial' | string;
  payouts: unknown[];
  message?: string;
}

export interface PaymentTransactionRow {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentsListResponse {
  status: 'partial' | string;
  provider: string;
  payments: PaymentTransactionRow[];
}
