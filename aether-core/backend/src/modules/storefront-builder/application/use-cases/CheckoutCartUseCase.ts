import { SiteRepository } from '../../domain/repositories/SiteRepository';
import { CartRepository } from '../../domain/repositories/CartRepository';
import { StorefrontCatalogPort } from '../ports/StorefrontCatalogPort';
import { CheckoutIdempotencyPort } from '../ports/CheckoutIdempotencyPort';
import type { StorefrontCustomerPort } from '../ports/StorefrontCustomerPort';
import { CreateOrderUseCase } from '../../../order-management/application/use-cases/CreateOrderUseCase';
import { PaymentService } from '../../../payment-fulfillment/application/services/PaymentService';
import { resolvePublicStorefrontProject } from '../services/resolvePublicStorefront';
import {
  CartEmptyError,
  CartNotFoundError,
  CartNotOpenError,
  CartProductNotFoundError,
  CheckoutIdempotencyRequiredError,
  CartValidationError,
  PaymentFailedError,
  StockInsufficientError,
} from './cartErrors';

export interface CheckoutCustomerInput {
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface CheckoutCartResult {
  orderId: string;
  clientSecret?: string;
  redirectUrl?: string;
}

export class CheckoutCartUseCase {
  constructor(
    private readonly siteRepository: SiteRepository,
    private readonly cartRepository: CartRepository,
    private readonly catalog: StorefrontCatalogPort,
    private readonly createOrder: CreateOrderUseCase,
    private readonly paymentService: PaymentService,
    private readonly checkoutIdempotency: CheckoutIdempotencyPort,
    private readonly customers: StorefrontCustomerPort
  ) {}

  async execute(
    tenantSlug: string,
    input: {
      cartId: string;
      customer: CheckoutCustomerInput;
      shippingAddress?: Record<string, unknown>;
      paymentMethod?: string;
      idempotencyKey?: string;
    }
  ): Promise<CheckoutCartResult> {
    const project = await resolvePublicStorefrontProject(this.siteRepository, tenantSlug);
    const tid = project.tenantId;

    const idempotencyKey = input.idempotencyKey?.trim();
    if (!idempotencyKey) {
      throw new CheckoutIdempotencyRequiredError();
    }

    const existing = await this.checkoutIdempotency.find(tid, idempotencyKey);
    if (existing) {
      return {
        orderId: existing.orderId,
        ...(existing.clientSecret ? { clientSecret: existing.clientSecret } : {}),
        ...(existing.redirectUrl ? { redirectUrl: existing.redirectUrl } : {}),
      };
    }

    const cart = await this.cartRepository.findById(tid, input.cartId);
    if (!cart) throw new CartNotFoundError();
    if (cart.status !== 'open') throw new CartNotOpenError();
    if (cart.items.length === 0) throw new CartEmptyError();

    const email = input.customer.email?.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      throw new CartValidationError('Valid customer email is required');
    }

    const orderLines: Array<{ productId: string; quantity: number; price: number }> = [];
    for (const item of cart.items) {
      const product = await this.catalog.getProductById(tid, item.productId);
      if (!product) throw new CartProductNotFoundError();

      let price = item.unitPrice ?? product.price;
      let available = product.stock;
      if (item.variantId) {
        const variant = product.variants?.find((v) => v.id === item.variantId);
        if (!variant) throw new CartProductNotFoundError('Variant not found');
        price = item.unitPrice ?? variant.price;
        available = variant.stock;
      }
      if (item.quantity > available) throw new StockInsufficientError();
      orderLines.push({
        productId: item.productId,
        quantity: item.quantity,
        price,
      });
    }

    const customer = await this.customers.upsertByEmail(tid, {
      email,
      firstName: input.customer.firstName ?? null,
      lastName: input.customer.lastName ?? null,
    });

    await this.cartRepository.setCustomerId(tid, cart.id, customer.id);

    const order = await this.createOrder.execute({
      tenantId: tid,
      customerId: customer.id,
      items: orderLines,
    });

    const paymentMethod = input.paymentMethod?.trim() || 'stripe';
    const payResult = await this.paymentService.processPayment(
      order.id,
      order.total,
      paymentMethod,
      { tenantId: tid, idempotencyKey: `pay:${idempotencyKey}` }
    );

    if (payResult.payment.status === 'failed') {
      throw new PaymentFailedError();
    }

    await this.catalog.decrementStock(
      tid,
      cart.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      }))
    );

    await this.cartRepository.updateStatus(tid, cart.id, 'checked_out');

    const result: CheckoutCartResult = {
      orderId: order.id,
      ...(payResult.clientSecret ? { clientSecret: payResult.clientSecret } : {}),
      ...(payResult.redirectUrl ? { redirectUrl: payResult.redirectUrl } : {}),
    };

    // Local/sandbox: always expose a clientSecret when payment succeeded without redirect.
    if (!result.clientSecret && !result.redirectUrl && payResult.payment.transactionId) {
      result.clientSecret = `local_cs_${payResult.payment.transactionId}`;
    }

    await this.checkoutIdempotency.save({
      tenantId: tid,
      key: idempotencyKey,
      orderId: result.orderId,
      clientSecret: result.clientSecret ?? null,
      redirectUrl: result.redirectUrl ?? null,
    });

    return result;
  }
}
