import { Router } from 'express';
import {
  createMessageSequenceController,
  deleteMessageSequenceController,
  listMessageSequencesController,
  updateMessageSequenceController
} from '../controllers/messageSequenceController.js';
import { authorizeAdminRequest } from '../middlewares/authenticateRequest.js';

const messageSequenceRouter = Router();

messageSequenceRouter.use(authorizeAdminRequest);

messageSequenceRouter.get('/message-sequences', listMessageSequencesController);
messageSequenceRouter.post('/message-sequences', createMessageSequenceController);
messageSequenceRouter.patch('/message-sequences/:id', updateMessageSequenceController);
messageSequenceRouter.delete('/message-sequences/:id', deleteMessageSequenceController);

export { messageSequenceRouter };
