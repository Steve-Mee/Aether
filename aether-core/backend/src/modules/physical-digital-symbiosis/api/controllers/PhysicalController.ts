import { Request, Response } from 'express';

export class PhysicalController {
  async registerLocation(req: Request, res: Response) {
    const { name, address, type } = req.body;
    // TODO: Save to database
    res.json({
      success: true,
      location: { id: 'loc_' + Date.now(), name, address, type, status: 'active' }
    });
  }

  async getAllLocations(req: Request, res: Response) {
    res.json({
      locations: [
        { id: 'loc_001', name: 'AETHER Pop-up Brussels', type: 'popup', status: 'active' },
        { id: 'loc_002', name: 'Smart Shelf - Antwerp', type: 'kiosk', status: 'active' }
      ]
    });
  }

  async startARSession(req: Request, res: Response) {
    const { productId, userId } = req.body;
    res.json({
      sessionId: 'ar_' + Date.now(),
      productId,
      userId,
      status: 'active',
      tryOnUrl: `https://ar.aether.com/try/${productId}`
    });
  }

  async syncSmartShelf(req: Request, res: Response) {
    const { shelfId, inventory } = req.body;
    res.json({
      success: true,
      message: `Smart Shelf ${shelfId} synced`,
      updatedItems: inventory.length
    });
  }

  async syncPhysicalInventory(req: Request, res: Response) {
    const { locationId, items } = req.body;
    res.json({
      success: true,
      locationId,
      syncedItems: items.length,
      timestamp: new Date().toISOString()
    });
  }
}
