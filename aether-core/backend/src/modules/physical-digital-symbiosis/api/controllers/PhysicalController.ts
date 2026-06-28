import { Request, Response } from 'express';
import { z } from 'zod';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { requireOperator, requireViewer } from '../../../../shared/security/rbac';
import { validateBody } from '../../../../shared/security/validate';
import { deviceAdapter } from '../../infrastructure/adapters/DeviceAdapter';
import { eventBus } from '../../../../shared/events/eventBus';
import {
  isPhysicalPeerEnabled,
} from '../../../../ai/intelligence/multi-agent/peer/PeerDelegationBridge';

const locationSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  type: z.string().min(1),
});

const arSessionSchema = z.object({
  productId: z.string().min(1),
});

const shelfSchema = z.object({
  shelfId: z.string().min(1),
  inventory: z.array(z.record(z.unknown())).optional(),
});

export class PhysicalController {
  registerLocation = [
    requireOperator,
    validateBody(locationSchema),
    async (req: Request, res: Response) => {
      const { name, address, type } = req.body;
      const { physicalLocations } = getCompositionRoot();
      const location = await physicalLocations.createLocation(req.tenantId!, { name, address, type });
      res.json({ status: 'partial', success: true, location });
    },
  ];

  getAllLocations = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { physicalLocations } = getCompositionRoot();
      const locations = await physicalLocations.listLocations(req.tenantId!);
      res.json({ status: 'partial', locations, adapter: deviceAdapter.name });
    },
  ];

  startARSession = [
    requireOperator,
    validateBody(arSessionSchema),
    async (req: Request, res: Response) => {
      const { productId } = req.body;
      const session = await deviceAdapter.startARSession(productId);
      await eventBus.publish({
        tenantId: req.tenantId!,
        type: 'decision.executed',
        payload: { event: 'physical.ar_session_started', sessionId: session.sessionId, productId },
      });
      res.json({ status: 'partial', ...session });
    },
  ];

  syncSmartShelf = [
    requireOperator,
    validateBody(shelfSchema),
    async (req: Request, res: Response) => {
      const { shelfId, inventory } = req.body;
      const result = await deviceAdapter.syncShelf(shelfId, inventory ?? []);
      await eventBus.publish({
        tenantId: req.tenantId!,
        type: 'decision.executed',
        payload: { event: 'physical.shelf_synced', shelfId, itemsUpdated: result.itemsUpdated },
      });

      if (isPhysicalPeerEnabled()) {
        const bridge = getCompositionRoot().peerDelegationBridge;
        if (bridge?.isAvailable()) {
          try {
            await bridge.runSpecialist({
              tenantId: req.tenantId!,
              agentKey: 'inventory',
              intent: 'INVENTORY_STATUS',
              command: `Smart shelf ${shelfId} synced (${result.itemsUpdated} items)`,
              contextSnippets: [],
              handlerResult: 'physical.shelf_synced',
              actorId: req.actorId,
            });
          } catch {
            // Best-effort peer specialist
          }
        }
      }

      res.json({ status: 'partial', success: true, ...result });
    },
  ];
}
