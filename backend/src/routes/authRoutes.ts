import { Router } from 'express';
import {
  getCurrentUserController,
  loginController,
  registerController
} from '../controllers/authController.js';

const publicAuthRouter = Router();
const protectedAuthRouter = Router();

publicAuthRouter.post('/auth/register', registerController);
publicAuthRouter.post('/auth/login', loginController);

protectedAuthRouter.get('/auth/me', getCurrentUserController);

export { publicAuthRouter, protectedAuthRouter };
