import { Router } from 'express';
import {
  createContactListController,
  deleteContactListController,
  listContactListsController,
  updateContactListController
} from '../controllers/contactListController.js';

const contactListRouter = Router();

contactListRouter.get('/contact-lists', listContactListsController);
contactListRouter.post('/contact-lists', createContactListController);
contactListRouter.patch('/contact-lists/:id', updateContactListController);
contactListRouter.delete('/contact-lists/:id', deleteContactListController);

export { contactListRouter };
