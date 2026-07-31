import { Request, Response } from 'express';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { PreviewTokenError } from '../../application/services/previewToken';
import { logger } from '../../../../shared/logging/logger';
import { sanitizePiiForLogs } from '../../../../shared/security/sanitizePiiForLogs';
import { ProductNotFoundError } from '../../application/use-cases/GetStorefrontProductUseCase';
import { PageNotFoundError } from '../../application/use-cases/GetStorefrontPageUseCase';
import {
  SiteNotFoundError,
  SiteNotLiveError,
} from '../../application/services/resolvePublicStorefront';
import {
  CartEmptyError,
  CartNotFoundError,
  CartNotOpenError,
  CartProductNotFoundError,
  CartValidationError,
  CheckoutIdempotencyRequiredError,
  PaymentFailedError,
  StockInsufficientError,
} from '../../application/use-cases/cartErrors';
import { sendStorefrontError } from '../storefrontErrors';
import { toCartDto } from '../cartMappers';

function handleStorefrontError(res: Response, err: unknown): boolean {
  if (err instanceof SiteNotFoundError) {
    sendStorefrontError(res, 404, 'SITE_NOT_FOUND', err.message);
    return true;
  }
  if (err instanceof SiteNotLiveError) {
    sendStorefrontError(res, 404, 'SITE_NOT_LIVE', err.message);
    return true;
  }
  if (err instanceof ProductNotFoundError || err instanceof CartProductNotFoundError) {
    sendStorefrontError(res, 404, 'PRODUCT_NOT_FOUND', err.message);
    return true;
  }
  if (err instanceof PageNotFoundError) {
    sendStorefrontError(res, 404, 'PAGE_NOT_FOUND', err.message);
    return true;
  }
  if (err instanceof PreviewTokenError) {
    sendStorefrontError(res, 401, err.code, err.message);
    return true;
  }
  if (err instanceof CartNotFoundError) {
    sendStorefrontError(res, 404, 'CART_NOT_FOUND', err.message);
    return true;
  }
  if (err instanceof CartEmptyError) {
    sendStorefrontError(res, 422, 'CART_EMPTY', err.message);
    return true;
  }
  if (err instanceof StockInsufficientError) {
    sendStorefrontError(res, 422, 'STOCK_INSUFFICIENT', err.message);
    return true;
  }
  if (err instanceof CheckoutIdempotencyRequiredError) {
    sendStorefrontError(res, 400, 'CHECKOUT_IDEMPOTENCY_REQUIRED', err.message);
    return true;
  }
  if (err instanceof PaymentFailedError) {
    sendStorefrontError(res, 502, 'PAYMENT_FAILED', err.message);
    return true;
  }
  if (err instanceof CartNotOpenError) {
    sendStorefrontError(res, 409, 'CART_NOT_OPEN', err.message);
    return true;
  }
  if (err instanceof CartValidationError) {
    sendStorefrontError(res, 400, 'VALIDATION_FAILED', err.message);
    return true;
  }
  return false;
}

export class StorefrontController {
  static resolveSite = async (req: Request, res: Response) => {
    try {
      const { resolveStorefrontSite } = getCompositionRoot();
      const site = await resolveStorefrontSite.execute(
        req.params.tenantSlug,
        req.header('Authorization')
      );
      res.json({
        site: {
          slug: site.slug,
          status: site.status,
          revisionId: site.revisionId,
          locales: site.locales,
          tokens: site.tokens,
        },
      });
    } catch (err) {
      if (handleStorefrontError(res, err)) return;
      sendStorefrontError(res, 500, 'INTERNAL_ERROR', 'Failed to resolve storefront site');
    }
  };

  static getCatalog = async (req: Request, res: Response) => {
    try {
      const { getStorefrontCatalog } = getCompositionRoot();
      const limitRaw = req.query.limit;
      const limit =
        typeof limitRaw === 'string' && limitRaw.length > 0
          ? parseInt(limitRaw, 10)
          : undefined;
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
      const result = await getStorefrontCatalog.execute(req.params.tenantSlug, {
        limit: Number.isFinite(limit) ? limit : undefined,
        cursor,
      });
      res.json({
        products: result.products.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description ?? null,
          price: p.price,
          currency: p.currency,
          stock: p.stock,
          imageUrl: p.imageUrl ?? null,
        })),
        nextCursor: result.nextCursor,
      });
    } catch (err) {
      if (handleStorefrontError(res, err)) return;
      sendStorefrontError(res, 500, 'INTERNAL_ERROR', 'Failed to load catalog');
    }
  };

  static getProduct = async (req: Request, res: Response) => {
    try {
      const { getStorefrontProduct } = getCompositionRoot();
      const product = await getStorefrontProduct.execute(
        req.params.tenantSlug,
        req.params.slug
      );
      res.json({
        product: {
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description ?? null,
          price: product.price,
          currency: product.currency,
          stock: product.stock,
          imageUrl: product.imageUrl ?? null,
          variants: product.variants ?? [],
        },
      });
    } catch (err) {
      if (handleStorefrontError(res, err)) return;
      sendStorefrontError(res, 500, 'INTERNAL_ERROR', 'Failed to load product');
    }
  };

  static getPage = async (req: Request, res: Response) => {
    try {
      const pathParam = req.query.path;
      if (typeof pathParam !== 'string' || pathParam.length === 0) {
        sendStorefrontError(res, 400, 'VALIDATION_FAILED', 'Query param path is required');
        return;
      }
      const { getStorefrontPage } = getCompositionRoot();
      const page = await getStorefrontPage.execute(
        req.params.tenantSlug,
        pathParam,
        req.header('Authorization')
      );
      res.json({
        page: {
          id: page.id,
          path: page.path,
          title: page.title,
          seoJson: page.seoJson,
          treeJson: page.treeJson,
        },
      });
    } catch (err) {
      if (handleStorefrontError(res, err)) return;
      sendStorefrontError(res, 500, 'INTERNAL_ERROR', 'Failed to load page');
    }
  };

  static createCart = async (req: Request, res: Response) => {
    try {
      const { createStorefrontCart } = getCompositionRoot();
      const cart = await createStorefrontCart.execute(req.params.tenantSlug);
      res.status(201).json({ cart: toCartDto(cart) });
    } catch (err) {
      if (handleStorefrontError(res, err)) return;
      sendStorefrontError(res, 500, 'INTERNAL_ERROR', 'Failed to create cart');
    }
  };

  static getCart = async (req: Request, res: Response) => {
    try {
      const { getStorefrontCart } = getCompositionRoot();
      const cart = await getStorefrontCart.execute(
        req.params.tenantSlug,
        req.params.cartId
      );
      res.json({ cart: toCartDto(cart) });
    } catch (err) {
      if (handleStorefrontError(res, err)) return;
      sendStorefrontError(res, 500, 'INTERNAL_ERROR', 'Failed to load cart');
    }
  };

  static addCartItem = async (req: Request, res: Response) => {
    try {
      const productId = req.body?.productId;
      const quantity = req.body?.quantity;
      if (typeof productId !== 'string' || productId.length === 0) {
        sendStorefrontError(res, 400, 'VALIDATION_FAILED', 'productId is required');
        return;
      }
      if (typeof quantity !== 'number') {
        sendStorefrontError(res, 400, 'VALIDATION_FAILED', 'quantity must be a number');
        return;
      }
      const { addStorefrontCartItem } = getCompositionRoot();
      const cart = await addStorefrontCartItem.execute(
        req.params.tenantSlug,
        req.params.cartId,
        {
          productId,
          variantId: typeof req.body?.variantId === 'string' ? req.body.variantId : null,
          quantity,
        }
      );
      res.status(201).json({ cart: toCartDto(cart) });
    } catch (err) {
      if (handleStorefrontError(res, err)) return;
      sendStorefrontError(res, 500, 'INTERNAL_ERROR', 'Failed to add cart item');
    }
  };

  static updateCartItem = async (req: Request, res: Response) => {
    try {
      const quantity = req.body?.quantity;
      if (typeof quantity !== 'number') {
        sendStorefrontError(res, 400, 'VALIDATION_FAILED', 'quantity must be a number');
        return;
      }
      const { updateStorefrontCartItem } = getCompositionRoot();
      const cart = await updateStorefrontCartItem.execute(
        req.params.tenantSlug,
        req.params.cartId,
        req.params.itemId,
        quantity
      );
      res.json({ cart: toCartDto(cart) });
    } catch (err) {
      if (handleStorefrontError(res, err)) return;
      sendStorefrontError(res, 500, 'INTERNAL_ERROR', 'Failed to update cart item');
    }
  };

  static removeCartItem = async (req: Request, res: Response) => {
    try {
      const { removeStorefrontCartItem } = getCompositionRoot();
      const cart = await removeStorefrontCartItem.execute(
        req.params.tenantSlug,
        req.params.cartId,
        req.params.itemId
      );
      res.json({ cart: toCartDto(cart) });
    } catch (err) {
      if (handleStorefrontError(res, err)) return;
      sendStorefrontError(res, 500, 'INTERNAL_ERROR', 'Failed to remove cart item');
    }
  };

  static checkout = async (req: Request, res: Response) => {
    try {
      const cartId = req.body?.cartId;
      const customer = req.body?.customer;
      if (typeof cartId !== 'string' || cartId.length === 0) {
        sendStorefrontError(res, 400, 'VALIDATION_FAILED', 'cartId is required');
        return;
      }
      if (!customer || typeof customer.email !== 'string') {
        sendStorefrontError(res, 400, 'VALIDATION_FAILED', 'customer.email is required');
        return;
      }

      const headerKey = req.header('Idempotency-Key') ?? req.header('idempotency-key');
      const bodyKey =
        typeof req.body?.idempotencyKey === 'string' ? req.body.idempotencyKey : undefined;
      const idempotencyKey = (headerKey || bodyKey || '').trim() || undefined;

      const { checkoutStorefrontCart } = getCompositionRoot();
      const result = await checkoutStorefrontCart.execute(req.params.tenantSlug, {
        cartId,
        customer: {
          email: customer.email,
          firstName:
            typeof customer.firstName === 'string' ? customer.firstName : undefined,
          lastName: typeof customer.lastName === 'string' ? customer.lastName : undefined,
        },
        shippingAddress:
          req.body?.shippingAddress && typeof req.body.shippingAddress === 'object'
            ? req.body.shippingAddress
            : undefined,
        paymentMethod:
          typeof req.body?.paymentMethod === 'string' ? req.body.paymentMethod : 'stripe',
        idempotencyKey,
      });

      logger.info(
        'storefront_checkout_created',
        sanitizePiiForLogs({
          tenantSlug: req.params.tenantSlug,
          cartId,
          orderId: result.orderId,
          // Never log customer email / address — only presence flags
          hasCustomerEmail: true,
          hasShippingAddress: Boolean(req.body?.shippingAddress),
        })
      );

      res.status(201).json({
        orderId: result.orderId,
        ...(result.clientSecret ? { clientSecret: result.clientSecret } : {}),
        ...(result.redirectUrl ? { redirectUrl: result.redirectUrl } : {}),
      });
    } catch (err) {
      if (handleStorefrontError(res, err)) return;
      sendStorefrontError(res, 500, 'INTERNAL_ERROR', 'Failed to checkout');
    }
  };
}
