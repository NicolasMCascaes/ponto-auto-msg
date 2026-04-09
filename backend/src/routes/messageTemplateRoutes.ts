import { Router } from 'express';
import {
  createMessageTemplateController,
  deleteMessageTemplateController,
  listMessageTemplatesController,
  updateMessageTemplateController
} from '../controllers/messageTemplateController.js';

const messageTemplateRouter = Router();

messageTemplateRouter.get('/message-templates', listMessageTemplatesController);
messageTemplateRouter.post('/message-templates', createMessageTemplateController);
messageTemplateRouter.patch('/message-templates/:id', updateMessageTemplateController);
messageTemplateRouter.delete('/message-templates/:id', deleteMessageTemplateController);

export { messageTemplateRouter };
