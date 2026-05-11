import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config';
import authRoutes from './routes/auth';

const app = express();

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/auth', authRoutes);

// Healthcheck pour Docker et monitoring
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  console.log(`Serveur démarré sur le port ${config.port}`);
});

export default app;
