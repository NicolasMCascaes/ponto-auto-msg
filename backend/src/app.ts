import express, { type Request, type Response } from 'express';
import { authenticateRequest } from './middlewares/authenticateRequest.js';
import { protectedAuthRouter, publicAuthRouter } from './routes/authRoutes.js';
import { contactListRouter } from './routes/contactListRoutes.js';
import { contactRouter } from './routes/contactRoutes.js';
import { healthRouter } from './routes/healthRoutes.js';
import { messageRouter } from './routes/messageRoutes.js';
import { whatsappRouter } from './routes/whatsappRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.set('etag', false);
const configuredCorsOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin?: string): boolean {
  if (!origin) {
    return true;
  }

  if (configuredCorsOrigins.includes(origin)) {
    return true;
  }

  return (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin === 'https://ponto-auto-msg-frontend.vercel.app' ||
    origin.endsWith('.vercel.app')
  );
}

app.use((req: Request, res: Response, next) => {
  const origin = req.headers.origin;

  if (isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin ?? '*');
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, ngrok-skip-browser-warning'
    );
  }

  res.header('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});
app.use(express.json());
app.use(healthRouter);
app.use(publicAuthRouter);
app.use(authenticateRequest);
app.use(protectedAuthRouter);
app.use(whatsappRouter);
app.use(contactRouter);
app.use(contactListRouter);
app.use(messageRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: { message: 'Route not found' } });
});

app.use(errorHandler);

export { app };
