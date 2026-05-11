import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { initSocket } from './lib/socket';
import authRoutes from './routes/auth';
import webhookRoutes from './routes/webhook';
import { startWorker } from './engine/worker';
import { startScheduler } from './engine/cron';

const app = express();
const httpServer = http.createServer(app);

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/auth', authRoutes);
app.use('/webhook', webhookRoutes);

// Healthcheck pour Docker et monitoring
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialise Socket.io sur le même serveur HTTP qu'Express
initSocket(httpServer);

// Démarre le worker BullMQ et le scheduleur cron dans le même process
startWorker();
startScheduler();

httpServer.listen(config.port, () => {
  console.log(`Serveur démarré sur le port ${config.port}`);
});

export default app;
