import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { initSocket } from './lib/socket';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import oauthRoutes from './routes/oauth';
import webhookRoutes from './routes/webhook';
import workflowRoutes from './routes/workflows';
import runsRoutes from './routes/runs';
import credentialsRoutes from './routes/credentials';
import dashboardRoutes from './routes/dashboard';
import notificationsRoutes from './routes/notifications';
import pushTokenRoutes from './routes/push-token';
import { startWorker } from './engine/worker';
import { startScheduler } from './engine/cron';

const app = express();
const httpServer = http.createServer(app);

app.use(cors({
  origin: config.cors.frontendUrl,
  credentials: true, // autorise l'envoi des cookies (refresh_token)
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/auth', authRoutes);
app.use('/auth', oauthRoutes);
app.use('/webhook', webhookRoutes);
app.use('/workflows', workflowRoutes);
app.use('/', runsRoutes);
app.use('/credentials', credentialsRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/', notificationsRoutes);
app.use('/', pushTokenRoutes);

// Healthcheck pour Docker et monitoring
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Doit être déclaré après toutes les routes — Express le reconnaît comme handler d'erreur via ses 4 paramètres
app.use(errorHandler);

// Initialise Socket.io sur le même serveur HTTP qu'Express
initSocket(httpServer);

// Démarre le worker BullMQ et le scheduleur cron dans le même process
startWorker();
startScheduler();

httpServer.listen(config.port, () => {
  console.log(`Serveur démarré sur le port ${config.port}`);
});

export default app;
