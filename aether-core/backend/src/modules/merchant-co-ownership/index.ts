import { Router } from 'express';
import { MerchantCoOwnershipController } from './api/controllers/MerchantCoOwnershipController';

const router = Router();
const controller = new MerchantCoOwnershipController();

router.post('/shares', ...controller.issueShares);
router.get('/shares/:merchantId', ...controller.getMerchantShares);
router.get('/marketplace', ...controller.getMarketplaceListings);
router.post('/marketplace', ...controller.createMarketplaceListing);

export default router;
