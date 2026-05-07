import { Router } from 'express';
import { EmailController } from './api/controllers/EmailController';

const router = Router();

router.get('/', EmailController.getAll);
router.post('/process', EmailController.processIncoming);

export default router;