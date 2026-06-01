import { Router } from 'express';
import { prisma } from '../../shared/prisma/client';
import { PrismaPluginRepository } from './infrastructure/persistence/PrismaPluginRepository';
import { PluginRegistry } from './application/services/PluginRegistry';
import { RegisterPluginUseCase } from './application/use-cases/RegisterPluginUseCase';
import { PluginController } from './api/controllers/PluginController';

const router = Router();
const pluginRepository = new PrismaPluginRepository(prisma);
const pluginRegistry = new PluginRegistry(pluginRepository);
const registerPluginUseCase = new RegisterPluginUseCase(pluginRepository, pluginRegistry);
const pluginController = new PluginController(registerPluginUseCase, pluginRegistry);

router.post('/', ...pluginController.registerPlugin);
router.get('/', ...pluginController.getAllPlugins);
router.post('/:id/activate', ...pluginController.activatePlugin);

export default router;
