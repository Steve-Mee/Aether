/**
 * Admin Website API — single router for `/api/website/*` (P03).
 * Mounted behind featureGate('storefront-builder') in app.ts.
 * No parallel controller class — handlers live in route modules only.
 */
import { Router } from 'express';
import websiteBuildsPreviewRoutes from './websiteBuildsPreviewRoutes';
import websitePagesRoutes from './websitePagesRoutes';
import websiteProjectsRoutes from './websiteProjectsRoutes';
import websiteRevisionsRoutes from './websiteRevisionsRoutes';

const router = Router();

router.use(websiteProjectsRoutes);
router.use(websiteRevisionsRoutes);
router.use(websitePagesRoutes);
router.use(websiteBuildsPreviewRoutes);

export default router;
