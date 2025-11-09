import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import router from './routes';
import { initDb } from './db';

const app = express();

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim());
app.use(
  cors({
    origin: corsOrigin && corsOrigin.length > 0 ? corsOrigin : '*',
    credentials: false,
  })
);

app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// Mount API routes with /api prefix
app.use('/api', router);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Error handler (fallback)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

const port = Number(process.env.PORT || 4000);

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
