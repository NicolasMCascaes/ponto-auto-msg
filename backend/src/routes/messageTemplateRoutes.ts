import { Router } from 'express';
import {
  createMessageTemplateController,
  deleteMessageTemplateController,
  listMessageTemplatesController,
  updateMessageTemplateController
} from '../controllers/messageTemplateController.js';
import { authorizeAdminRequest } from '../middlewares/authenticateRequest.js';

const messageTemplateRouter = Router();

messageTemplateRouter.use(authorizeAdminRequest);

messageTemplateRouter.get('/message-templates', listMessageTemplatesController);
messageTemplateRouter.post('/message-templates', createMessageTemplateController);
messageTemplateRouter.patch('/message-templates/:id', updateMessageTemplateController);
messageTemplateRouter.delete('/message-templates/:id', deleteMessageTemplateController);

export { messageTemplateRouter };
