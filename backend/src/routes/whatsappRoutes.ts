import { Router } from 'express';
import {
  getWhatsappStatusController,
  sendWhatsappMessageController,
  startWhatsappConnectionController
} from '../controllers/whatsappController.js';

const whatsappRouter = Router();

whatsappRouter.post('/whatsapp/connect', startWhatsappConnectionController);
whatsappRouter.get('/whatsapp/status', getWhatsappStatusController);
whatsappRouter.post('/messages/send', sendWhatsappMessageController);

export { whatsappRouter };
