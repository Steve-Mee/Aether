import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  getChannelSyncSettings,
  setChannelSyncTenantEnabled,
} from '../../../shared/features/channelSyncSettings';

const router = Router();

router.get('/settings', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const settings = await getChannelSyncSettings(tenantId);
    res.json(settings);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load channel sync settings',
    });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { enabled } = req.body as { enabled?: boolean };
    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'enabled (boolean) is required' });
      return;
    }

    const result = await setChannelSyncTenantEnabled(tenantId, enabled);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update channel sync settings',
    });
  }
});

export default router;
