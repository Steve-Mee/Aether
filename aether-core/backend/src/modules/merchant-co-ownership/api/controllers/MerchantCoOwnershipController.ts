import { Request, Response } from 'express';
import { z } from 'zod';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { requireOperator, requireViewer } from '../../../../shared/security/rbac';
import { validateBody } from '../../../../shared/security/validate';
import { assertCoOwnershipAllowed, assertMarketplaceListingAllowed } from '../../../../shared/security/antiAbuseService';

const shareSchema = z.object({
  merchantId: z.string().min(1),
  percentage: z.number().min(0).max(100),
});

const listingSchema = z.object({
  type: z.string().min(1).max(100),
  price: z.number().positive(),
  sellerId: z.string().min(1),
});

export class MerchantCoOwnershipController {
  issueShares = [
    requireOperator,
    validateBody(shareSchema),
    async (req: Request, res: Response) => {
      const { merchantId, percentage } = req.body;
      try {
        await assertCoOwnershipAllowed(req.tenantId!, merchantId);
      } catch (error: unknown) {
        res.status(429).json({ error: error instanceof Error ? error.message : 'Rate limited' });
        return;
      }
      const { merchantCoOwnership } = getCompositionRoot();
      const share = await merchantCoOwnership.issueShare(req.tenantId!, merchantId, percentage);
      res.json({ status: 'experimental', success: true, share });
    },
  ];

  getMerchantShares = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { merchantCoOwnership } = getCompositionRoot();
      const shares = await merchantCoOwnership.listShares(req.tenantId!, req.params.merchantId);
      const total = shares.reduce((s, r) => s + r.percentage, 0);
      res.json({
        status: 'experimental',
        merchantId: req.params.merchantId,
        totalShares: shares.length,
        ownershipPercentage: total,
      });
    },
  ];

  getMarketplaceListings = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { merchantCoOwnership } = getCompositionRoot();
      const listings = await merchantCoOwnership.listActiveListings(req.tenantId!);
      res.json({ status: 'experimental', listings });
    },
  ];

  createMarketplaceListing = [
    requireOperator,
    validateBody(listingSchema),
    async (req: Request, res: Response) => {
      try {
        await assertMarketplaceListingAllowed(req.tenantId!);
      } catch (error: unknown) {
        res.status(429).json({ error: error instanceof Error ? error.message : 'Listing blocked' });
        return;
      }
      const { type, price, sellerId } = req.body;
      const { merchantCoOwnership } = getCompositionRoot();
      const listing = await merchantCoOwnership.createListing(req.tenantId!, { type, price, sellerId });
      res.status(201).json({ status: 'experimental', listing });
    },
  ];
}
