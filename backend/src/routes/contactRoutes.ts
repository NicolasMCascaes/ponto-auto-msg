import { Router } from 'express';
import {
  createContactController,
  deleteContactController,
  listContactsController,
  updateContactController
} from '../controllers/contactController.js';

const contactRouter = Router();

contactRouter.get('/contacts', listContactsController);
contactRouter.post('/contacts', createContactController);
contactRouter.patch('/contacts/:id', updateContactController);
contactRouter.delete('/contacts/:id', deleteContactController);

export { contactRouter };
