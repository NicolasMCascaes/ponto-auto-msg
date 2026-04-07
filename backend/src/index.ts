import express, { type Request, type Response } from 'express';
import { contactListRouter } from './routes/contactListRoutes.js';
import { contactRouter } from './routes/contactRoutes.js';
import { healthRouter } from './routes/healthRoutes.js';
import { messageRouter } from './routes/messageRoutes.js';
import { whatsappRouter } from './routes/whatsappRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(express.json());
app.use(healthRouter);
app.use(whatsappRouter);
app.use(contactRouter);
app.use(contactListRouter);
app.use(messageRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: { message: 'Route not found' } });
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
