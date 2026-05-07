import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import all 14 modules
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

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '0.5.0',
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
    ]
  });
});

// Mount all modules
app.use('/api/products', productCatalogRouter);
app.use('/api/emails', aetherMailRouter);
app.use('/api/suppliers', supplierIntelligenceRouter);
app.use('/api/autonomous', autonomousOperationsRouter);
app.use('/api/admin', adminCommandBarRouter);
app.use('/api/predictive', predictiveCommerceRouter);
app.use('/api/self-evolving', selfEvolvingRouter);
app.use('/api/orders', orderManagementRouter);
app.use('/api/agentic', agenticCommerceRouter);
app.use('/api/inventory', inventoryPricingRouter);
app.use('/api/plugins', pluginSystemRouter);
app.use('/api/hive-mind', hiveMindRouter);
app.use('/api/physical', physicalDigitalRouter);
app.use('/api/co-ownership', merchantCoOwnershipRouter);

const PORT = process.env.PORT || 9000;

app.listen(PORT, () => {
  console.log(`🚀 AETHER Core v0.5.0 running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🛍️  Products:      http://localhost:${PORT}/api/products`);
  console.log(`📧 Emails:        http://localhost:${PORT}/api/emails`);
  console.log(`🏭 Suppliers:     http://localhost:${PORT}/api/suppliers`);
  console.log(`🤖 Autonomous:    http://localhost:${PORT}/api/autonomous`);
  console.log(`🧠 Admin + AI:    http://localhost:${PORT}/api/admin`);
  console.log(`📈 Predictive:    http://localhost:${PORT}/api/predictive`);
  console.log(`🧬 Self-Evolving: http://localhost:${PORT}/api/self-evolving`);
  console.log(`📦 Orders:        http://localhost:${PORT}/api/orders`);
  console.log(`🤝 Agentic:       http://localhost:${PORT}/api/agentic`);
  console.log(`📦 Inventory:     http://localhost:${PORT}/api/inventory`);
  console.log(`🔌 Plugins:       http://localhost:${PORT}/api/plugins`);
  console.log(`🧠 Hive Mind:     http://localhost:${PORT}/api/hive-mind`);
  console.log(`🏪 Physical:      http://localhost:${PORT}/api/physical`);
  console.log(`💰 Co-Ownership:  http://localhost:${PORT}/api/co-ownership`);
});
