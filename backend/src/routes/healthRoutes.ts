import { Router } from 'express';
import { getHealthController } from '../controllers/healthController.js';

const healthRouter = Router();

healthRouter.get('/health', getHealthController);

export { healthRouter };
