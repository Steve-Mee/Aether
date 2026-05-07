import { Router } from 'express';
import { AdminController } from './api/controllers/AdminController';

const router = Router();
const controller = new AdminController();

// Natural Language Command Bar
router.post('/command', controller.executeCommand.bind(controller));

// Dashboard summary
router.get('/dashboard', controller.getDashboardSummary.bind(controller));

// Command history
router.get('/commands', controller.getCommandHistory.bind(controller));

export default router;