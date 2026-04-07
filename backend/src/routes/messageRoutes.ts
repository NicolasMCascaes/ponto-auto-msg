import { Router } from 'express';
import {
  getMessagesController,
  getRecentMessagesController,
  sendBatchMessagesController,
  sendWhatsappMessageController
} from '../controllers/messageController.js';

const messageRouter = Router();

messageRouter.get('/messages', getMessagesController);
messageRouter.get('/messages/recent', getRecentMessagesController);
messageRouter.post('/messages/send', sendWhatsappMessageController);
messageRouter.post('/messages/send-batch', sendBatchMessagesController);

export { messageRouter };
