import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config';
import authRoutes from './routes/auth';
import webhookRoutes from './routes/webhook';
import { startWorker } from './engine/worker';
import { startScheduler } from './engine/cron';

const app = express();

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/auth', authRoutes);
app.use('/webhook', webhookRoutes);

// Healthcheck pour Docker et monitoring
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Démarre le worker BullMQ et le scheduleur cron dans le même process
startWorker();
startScheduler();

app.listen(config.port, () => {
  console.log(`Serveur démarré sur le port ${config.port}`);
});

export default app;
