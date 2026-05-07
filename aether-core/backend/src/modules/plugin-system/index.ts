import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaPluginRepository } from './infrastructure/persistence/PrismaPluginRepository';
import { PluginRegistry } from './application/services/PluginRegistry';
import { RegisterPluginUseCase } from './application/use-cases/RegisterPluginUseCase';
import { PluginController } from './api/controllers/PluginController';

const router = Router();
const prisma = new PrismaClient();

const pluginRepository = new PrismaPluginRepository(prisma);
const pluginRegistry = new PluginRegistry(pluginRepository);
const registerPluginUseCase = new RegisterPluginUseCase(pluginRepository, pluginRegistry);
const pluginController = new PluginController(registerPluginUseCase, pluginRegistry);

// Routes
router.post('/', pluginController.registerPlugin.bind(pluginController));
router.get('/', pluginController.getAllPlugins.bind(pluginController));
router.post('/:id/activate', pluginController.activatePlugin.bind(pluginController));

export default router;