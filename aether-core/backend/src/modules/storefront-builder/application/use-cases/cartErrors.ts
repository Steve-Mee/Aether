export class CartNotFoundError extends Error {
  readonly code = 'CART_NOT_FOUND';
  constructor(message = 'Cart not found') {
    super(message);
    this.name = 'CartNotFoundError';
  }
}

export class CartEmptyError extends Error {
  readonly code = 'CART_EMPTY';
  constructor(message = 'Cannot checkout an empty cart') {
    super(message);
    this.name = 'CartEmptyError';
  }
}

export class StockInsufficientError extends Error {
  readonly code = 'STOCK_INSUFFICIENT';
  constructor(message = 'Insufficient stock for one or more cart items') {
    super(message);
    this.name = 'StockInsufficientError';
  }
}

export class CartProductNotFoundError extends Error {
  readonly code = 'PRODUCT_NOT_FOUND';
  constructor(message = 'Product not found for this storefront') {
    super(message);
    this.name = 'CartProductNotFoundError';
  }
}

export class CheckoutIdempotencyRequiredError extends Error {
  readonly code = 'CHECKOUT_IDEMPOTENCY_REQUIRED';
  constructor(message = 'Idempotency-Key header or body idempotencyKey is required') {
    super(message);
    this.name = 'CheckoutIdempotencyRequiredError';
  }
}

export class PaymentFailedError extends Error {
  readonly code = 'PAYMENT_FAILED';
  constructor(message = 'Payment processing failed') {
    super(message);
    this.name = 'PaymentFailedError';
  }
}

export class CartNotOpenError extends Error {
  readonly code = 'CART_NOT_OPEN';
  constructor(message = 'Cart is not open for modification') {
    super(message);
    this.name = 'CartNotOpenError';
  }
}

export class CartValidationError extends Error {
  readonly code = 'VALIDATION_FAILED';
  constructor(message: string) {
    super(message);
    this.name = 'CartValidationError';
  }
}
