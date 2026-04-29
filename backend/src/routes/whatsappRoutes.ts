import { Router } from 'express';
import {
  getWhatsappStatusController,
  requestWhatsappPairingCodeController,
  resetWhatsappConnectionController,
  startWhatsappConnectionController
} from '../controllers/whatsappController.js';

const whatsappRouter = Router();

whatsappRouter.post('/whatsapp/connect', startWhatsappConnectionController);
whatsappRouter.post('/whatsapp/pairing-code', requestWhatsappPairingCodeController);
whatsappRouter.post('/whatsapp/reset', resetWhatsappConnectionController);
whatsappRouter.get('/whatsapp/status', getWhatsappStatusController);

export { whatsappRouter };
