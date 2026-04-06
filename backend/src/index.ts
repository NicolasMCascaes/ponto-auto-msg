import express from 'express';
import { healthRouter } from './routes/healthRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(express.json());
app.use(healthRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { message: 'Route not found' } });
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
