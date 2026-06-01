import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { authMiddleware } from './shared/security/auth';
import { rateLimitMiddleware } from './shared/security/rateLimit';
import { tracingMiddleware } from './shared/observability/tracingMiddleware';
import { featureGate } from './shared/features/featureFlags';
import { logger } from './shared/logging/logger';
import { bootstrapApplication } from './bootstrap/compositionRoot';

import productCatalogRouter from './modules/product-catalog';
import aetherMailRouter from './modules/aether-mail';
import supplierIntelligenceRouter from './modules/supplier-intelligence';
import autonomousOperationsRouter from './modules/autonomous-operations';
import adminCommandBarRouter from './modules/admin-command-bar';
import predictiveCommerceRouter from './modules/predictive-commerce';
import selfEvolvingRouter from './modules/self-evolving-codebase';
import orderManagementRouter from './modules/order-management';
import agenticCommerceRouter from './modules/agentic-commerce';
import inventoryPricingRouter from './modules/inventory-pricing';
import pluginSystemRouter from './modules/plugin-system';
import hiveMindRouter from './modules/zero-knowledge-hive-mind';
import physicalDigitalRouter from './modules/physical-digital-symbiosis';
import merchantCoOwnershipRouter from './modules/merchant-co-ownership';
import paymentFulfillmentRouter from './modules/payment-fulfillment';
import approvalsRouter from './modules/approvals';
import outcomesRouter from './modules/outcomes';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const VERSION = '0.8.1';

export function createApp(): Express {
  bootstrapApplication();

  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(tracingMiddleware);

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info('http_request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - start,
        tenantId: req.tenantId,
      });
    });
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      version: VERSION,
      timestamp: new Date().toISOString(),
      modules: [
        'product-catalog',
        'aether-mail',
        'supplier-intelligence',
        'autonomous-operations',
        'admin-command-bar',
        'predictive-commerce',
        'self-evolving-codebase',
        'order-management',
        'agentic-commerce',
        'inventory-pricing',
        'plugin-system',
        'zero-knowledge-hive-mind',
        'physical-digital-symbiosis',
        'merchant-co-ownership',
        'payment-fulfillment',
        'approvals',
        'outcomes',
      ],
    });
  });

  app.use(authMiddleware);
  app.use(rateLimitMiddleware);

  app.use('/api/products', productCatalogRouter);
  app.use('/api/emails', aetherMailRouter);
  app.use('/api/suppliers', supplierIntelligenceRouter);
  app.use('/api/autonomous', autonomousOperationsRouter);
  app.use('/api/admin', adminCommandBarRouter);
  app.use('/api/orders', orderManagementRouter);
  app.use('/api/inventory', inventoryPricingRouter);
  app.use('/api/plugins', pluginSystemRouter);
  app.use('/api/hive-mind', hiveMindRouter);
  app.use('/api/payments', paymentFulfillmentRouter);
  app.use('/api/approvals', approvalsRouter);
  app.use('/api/outcomes', outcomesRouter);

  // Feature-gated experimental modules
  app.use('/api/predictive', featureGate('predictive'), predictiveCommerceRouter);
  app.use('/api/self-evolving', featureGate('self-evolving'), selfEvolvingRouter);
  app.use('/api/agentic', featureGate('agentic'), agenticCommerceRouter);
  app.use('/api/physical', featureGate('physical'), physicalDigitalRouter);
  app.use('/api/co-ownership', featureGate('co-ownership'), merchantCoOwnershipRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('unhandled_error', { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export { VERSION };
