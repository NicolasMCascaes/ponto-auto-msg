import { Router } from 'express';
import {
  createUserController,
  getCurrentUserController,
  loginController
} from '../controllers/authController.js';
import { authorizeAdminRequest } from '../middlewares/authenticateRequest.js';

const publicAuthRouter = Router();
const protectedAuthRouter = Router();

publicAuthRouter.post('/auth/login', loginController);

protectedAuthRouter.get('/auth/me', getCurrentUserController);
protectedAuthRouter.post('/users', authorizeAdminRequest, createUserController);

export { publicAuthRouter, protectedAuthRouter };
