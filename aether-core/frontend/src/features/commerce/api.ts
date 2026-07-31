import { apiFetch, apiRoutes } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';
import type {
  CustomerDetail,
  CustomerRow,
  InventoryItem,
  OrderDetail,
  PaymentsListResponse,
  PaymentsPayoutsResponse,
  PaymentsSummary,
  ProductDetail,
  ProductVariant,
  PromotionRow,
} from './types';

export const commerceApi = {
  queryKeys,

  listProducts: () => apiFetch<ProductDetail[]>(apiRoutes.products.list),

  getProduct: (id: string) => apiFetch<ProductDetail>(apiRoutes.products.detail(id)),

  createProduct: (input: {
    name: string;
    slug: string;
    description?: string;
    price?: number;
    stock?: number;
  }) =>
    apiFetch<ProductDetail>(apiRoutes.products.list, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateProduct: (id: string, input: Partial<ProductDetail>) =>
    apiFetch<ProductDetail>(apiRoutes.products.detail(id), {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  createVariant: (productId: string, input: { sku: string; price: number; stock?: number }) =>
    apiFetch<ProductVariant>(apiRoutes.products.variants(productId), {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  uploadMedia: (
    productId: string,
    input: { filename: string; mimeType: string; contentBase64: string; alt?: string },
  ) =>
    apiFetch<{ product: ProductDetail }>(apiRoutes.products.media(productId), {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getOrder: (id: string) => apiFetch<OrderDetail>(apiRoutes.orders.detail(id)),

  shipOrder: (id: string, input: { carrier: string; trackingNumber: string }) =>
    apiFetch<{ shipment: unknown; order: OrderDetail }>(apiRoutes.orders.ship(id), {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  refundOrder: (id: string, input: { amount: number; reason?: string }) =>
    apiFetch<{ refund: unknown; approval: { id: string; status: string } | null }>(
      apiRoutes.orders.refunds(id),
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    ),

  listCustomers: () =>
    apiFetch<{ customers: CustomerRow[] }>(apiRoutes.customers.list).then((r) => r.customers),

  getCustomer: (id: string) =>
    apiFetch<{ customer: CustomerDetail }>(apiRoutes.customers.detail(id)).then((r) => r.customer),

  listCustomerOrders: (id: string) =>
    apiFetch<{ orders: Array<{ id: string; status: string; total: number; createdAt?: string }> }>(
      apiRoutes.customers.orders(id),
    ).then((r) => r.orders),

  listInventory: () =>
    apiFetch<{ items: InventoryItem[] }>(apiRoutes.inventory.list).then((r) => r.items),

  listLowStock: () =>
    apiFetch<{ lowStockProducts: Array<{ id: string; productId: string; quantity: number }> }>(
      apiRoutes.inventory.lowStock,
    ).then((r) => r.lowStockProducts),

  adjustInventory: (input: { productId: string; warehouseId?: string; quantity: number }) =>
    apiFetch<{ success: boolean; adjustment: unknown }>(apiRoutes.inventory.adjust, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  listPromotions: () =>
    apiFetch<{ status: string; promotions: PromotionRow[] }>(apiRoutes.promotions.list).then(
      (r) => r.promotions,
    ),

  createPromotion: (input: {
    name: string;
    type?: 'percent' | 'fixed';
    value?: number;
    code?: string | null;
  }) =>
    apiFetch<{ status: string; promotion: PromotionRow }>(apiRoutes.promotions.list, {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((r) => r.promotion),


  getPaymentsSummary: () => apiFetch<PaymentsSummary>(apiRoutes.payments.summary),

  listPayments: () =>
    apiFetch<PaymentsListResponse>(apiRoutes.payments.list).then((r) => r.payments),

  listPaymentPayouts: () => apiFetch<PaymentsPayoutsResponse>(apiRoutes.payments.payouts),

  reconcilePayments: () =>
    apiFetch<{
      status: string;
      kind: string;
      message?: string;
      reconciled: number;
      pending: number;
    }>(apiRoutes.payments.reconcile, { method: 'POST' }),
};
