import express from 'express';

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
