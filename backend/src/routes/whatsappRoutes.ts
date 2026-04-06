import { Router } from 'express';
import {
  getWhatsappStatusController,
  startWhatsappConnectionController
} from '../controllers/whatsappController.js';

const whatsappRouter = Router();

whatsappRouter.post('/whatsapp/connect', startWhatsappConnectionController);
whatsappRouter.get('/whatsapp/status', getWhatsappStatusController);

export { whatsappRouter };
