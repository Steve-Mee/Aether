import { Router } from 'express';
import type { Request, Response } from 'express';
import { ChannelConnectionService } from '../application/services/ChannelConnectionService';
import { SyncConnectionUseCase } from '../application/use-cases/SyncConnectionUseCase';
import { PrismaChannelConnectionRepository } from '../infrastructure/persistence/PrismaChannelConnectionRepository';
import { PrismaChannelCatalogAdapter } from '../infrastructure/persistence/PrismaChannelCatalogAdapter';
import { ShopifyChannelAdapter } from '../infrastructure/adapters/ShopifyChannelAdapter';
import { prisma } from '../../../shared/prisma/client';
import { isFeatureEnabled } from '../../../shared/features/featureFlags';
import type { ChannelInventoryUpdate, ChannelProvider } from '../domain/types';

const router = Router();
const repository = new PrismaChannelConnectionRepository(prisma);
const catalogAdapter = new PrismaChannelCatalogAdapter(prisma);
const service = new ChannelConnectionService(repository);
const syncUseCase = new SyncConnectionUseCase(
  repository,
  service,
  catalogAdapter,
  catalogAdapter
);

async function requireChannelSync(req: Request, res: Response): Promise<string | null> {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const enabled = await isFeatureEnabled(tenantId, 'channel-sync');
  if (!enabled) {
    res.status(403).json({
      error: { code: 'CHANNEL_SYNC_DISABLED', message: "Feature 'channel-sync' is disabled" },
      status: 'gated',
    });
    return null;
  }
  return tenantId;
}

function sanitizeConnection(connection: Awaited<ReturnType<typeof service.getConnection>>) {
  if (!connection) return null;
  return {
    ...connection,
    config: {
      ...connection.config,
      credentials: {},
    },
  };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = await requireChannelSync(req, res);
    if (!tenantId) return;
    const connections = await service.listConnections(tenantId);
    res.json({ connections: connections.map((c) => sanitizeConnection(c)) });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch connections',
    });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = await requireChannelSync(req, res);
    if (!tenantId) return;

    const { provider, displayName, config } = req.body as {
      provider: string;
      displayName: string;
      config: Record<string, unknown>;
    };

    if (!provider || !displayName || !config) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const connection = await service.createConnection({
      tenantId,
      provider: provider as ChannelProvider,
      displayName,
      config: config as never,
    });

    res.status(201).json({ connection: sanitizeConnection(connection) });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create connection',
    });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = await requireChannelSync(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    const connection = await service.getConnection(id, tenantId);
    if (!connection) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    res.json({ connection: sanitizeConnection(connection) });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch connection',
    });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = await requireChannelSync(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    const updates = req.body as Record<string, unknown>;
    const connection = await service.updateConnection(id, tenantId, updates);

    res.json({ connection: sanitizeConnection(connection) });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update connection',
    });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = await requireChannelSync(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    await service.deleteConnection(id, tenantId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete connection',
    });
  }
});

router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const tenantId = await requireChannelSync(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    const result = await service.testConnection(id, tenantId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to test connection',
    });
  }
});

router.post('/:id/sync', async (req: Request, res: Response) => {
  try {
    const tenantId = await requireChannelSync(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    const result = await syncUseCase.execute(id, tenantId);
    res.json({ sync: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    const status = message === 'Connection not found' ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

router.get('/:id/metrics', async (req: Request, res: Response) => {
  try {
    const tenantId = await requireChannelSync(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    const connection = await service.getConnection(id, tenantId);
    if (!connection) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    const start = req.query.start
      ? new Date(String(req.query.start))
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = req.query.end ? new Date(String(req.query.end)) : new Date();

    const adapter = service.getAdapter(connection.provider, async (tid) => {
      if (tid !== tenantId) return null;
      return connection.config;
    });

    const result = await adapter.getMetrics({ tenantId, start, end });
    if (!result.success) {
      res.status(502).json({ error: result.error ?? 'Failed to compute metrics' });
      return;
    }

    res.json({ metrics: result.data });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch metrics',
    });
  }
});

router.post('/:id/inventory', async (req: Request, res: Response) => {
  try {
    const tenantId = await requireChannelSync(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    const connection = await service.getConnection(id, tenantId);
    if (!connection) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    const updates = (req.body as { updates?: ChannelInventoryUpdate[] }).updates ?? [];
    const adapter = service.getAdapter(connection.provider, async (tid) => {
      if (tid !== tenantId) return null;
      return connection.config;
    });

    const result = await adapter.pushInventoryUpdate({ tenantId, updates });
    if (!result.success) {
      res.status(502).json({ error: result.error ?? 'Inventory push failed' });
      return;
    }

    res.json({ result: result.data, warnings: result.error });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Inventory push failed',
    });
  }
});

router.get('/:id/oauth/url', async (req: Request, res: Response) => {
  try {
    const tenantId = await requireChannelSync(req, res);
    if (!tenantId) return;
    const { id } = req.params;
    const redirectUri = String(req.query.redirectUri ?? '');

    if (!redirectUri) {
      res.status(400).json({ error: 'redirectUri query parameter is required' });
      return;
    }

    const connection = await service.getConnection(id, tenantId);
    if (!connection) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    if (connection.provider !== 'shopify') {
      res.status(400).json({ error: 'OAuth is only supported for Shopify connections' });
      return;
    }

    const adapter = service.getAdapter('shopify', async (tid) => {
      if (tid !== tenantId) return null;
      return connection.config;
    }) as ShopifyChannelAdapter;

    const url = await adapter.getAuthUrl({
      tenantId,
      redirectUri,
      storeUrl: connection.storeUrl,
    });

    res.json({ url });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to build OAuth URL',
    });
  }
});

router.post('/:id/oauth/callback', async (req: Request, res: Response) => {
  try {
    const tenantId = await requireChannelSync(req, res);
    if (!tenantId) return;
    const { id } = req.params;
    const { code, redirectUri } = req.body as { code?: string; redirectUri?: string };

    if (!code || !redirectUri) {
      res.status(400).json({ error: 'code and redirectUri are required' });
      return;
    }

    const connection = await service.getConnection(id, tenantId);
    if (!connection) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    if (connection.provider !== 'shopify') {
      res.status(400).json({ error: 'OAuth is only supported for Shopify connections' });
      return;
    }

    const adapter = service.getAdapter('shopify', async (tid) => {
      if (tid !== tenantId) return null;
      return connection.config;
    }) as ShopifyChannelAdapter;

    const tokenResult = await adapter.exchangeCodeForToken({
      tenantId,
      code,
      redirectUri,
    });

    if (!tokenResult.success || !tokenResult.data?.accessToken) {
      res.status(502).json({ error: tokenResult.error ?? 'Token exchange failed' });
      return;
    }

    const updated = await service.updateConnection(id, tenantId, {
      config: {
        credentials: {
          ...connection.config.credentials,
          accessToken: tokenResult.data.accessToken,
        },
      },
    });

    res.json({ connection: sanitizeConnection(updated), connected: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'OAuth callback failed',
    });
  }
});

export default router;
