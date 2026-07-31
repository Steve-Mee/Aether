import { Router } from 'express';
import { MediaController } from './api/controllers/MediaController';

const mediaRouter = Router();

mediaRouter.get('/:mediaTenantId/:fileName', ...MediaController.serve);

export default mediaRouter;
