import { Router } from 'express';
import {
  getWhatsappStatusController,
  resetWhatsappConnectionController,
  startWhatsappConnectionController
} from '../controllers/whatsappController.js';

const whatsappRouter = Router();

whatsappRouter.post('/whatsapp/connect', startWhatsappConnectionController);
whatsappRouter.post('/whatsapp/reset', resetWhatsappConnectionController);
whatsappRouter.get('/whatsapp/status', getWhatsappStatusController);

export { whatsappRouter };
