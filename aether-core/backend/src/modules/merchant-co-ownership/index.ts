import { Router } from 'express';
import { MerchantCoOwnershipController } from './api/controllers/MerchantCoOwnershipController';

const router = Router();
const controller = new MerchantCoOwnershipController();

// Issue merchant ownership shares
router.post('/shares', controller.issueShares.bind(controller));

// Get merchant's ownership
router.get('/shares/:merchantId', controller.getMerchantShares.bind(controller));

// Distribute revenue
router.post('/revenue/distribute', controller.distributeRevenue.bind(controller));

// List marketplace listings (AETHER Economy)
router.get('/marketplace', controller.getMarketplaceListings.bind(controller));

export default router;