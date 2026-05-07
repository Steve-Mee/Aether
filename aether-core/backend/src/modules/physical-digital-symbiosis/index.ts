import { Router } from 'express';
import { PhysicalController } from './api/controllers/PhysicalController';

const router = Router();
const controller = new PhysicalController();

// Physical locations
router.post('/locations', controller.registerLocation.bind(controller));
router.get('/locations', controller.getAllLocations.bind(controller));

// AR Try-on
router.post('/ar-session', controller.startARSession.bind(controller));

// Smart Shelf
router.post('/smart-shelf/sync', controller.syncSmartShelf.bind(controller));

// Physical inventory sync
router.post('/inventory/sync', controller.syncPhysicalInventory.bind(controller));

export default router;
