import { Router } from 'express';
import { PhysicalController } from './api/controllers/PhysicalController';

const router = Router();
const controller = new PhysicalController();

router.post('/locations', ...controller.registerLocation);
router.get('/locations', ...controller.getAllLocations);
router.post('/ar-session', ...controller.startARSession);
router.post('/smart-shelf/sync', ...controller.syncSmartShelf);

export default router;
