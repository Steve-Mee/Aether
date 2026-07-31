import { Router } from 'express';
import { StorefrontController } from './controllers/StorefrontController';
import { storefrontRateLimitMiddleware } from './storefrontRateLimit';

const router = Router();

// IP-based in-memory rate limit (see storefrontRateLimit.ts JSDoc).
router.use(storefrontRateLimitMiddleware);

router.get('/:tenantSlug', StorefrontController.resolveSite);
router.get('/:tenantSlug/catalog', StorefrontController.getCatalog);
router.get('/:tenantSlug/products/:slug', StorefrontController.getProduct);
router.get('/:tenantSlug/pages', StorefrontController.getPage);

// Cart + checkout (P13) — public, slug-scoped
router.post('/:tenantSlug/carts', StorefrontController.createCart);
router.get('/:tenantSlug/carts/:cartId', StorefrontController.getCart);
router.post('/:tenantSlug/carts/:cartId/items', StorefrontController.addCartItem);
router.patch('/:tenantSlug/carts/:cartId/items/:itemId', StorefrontController.updateCartItem);
router.delete('/:tenantSlug/carts/:cartId/items/:itemId', StorefrontController.removeCartItem);
router.post('/:tenantSlug/checkout', StorefrontController.checkout);

export default router;
