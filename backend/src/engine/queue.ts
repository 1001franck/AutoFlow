import { Queue } from 'bullmq';
import { config } from '../config';

// Données transmises au worker lors du déclenchement d'un workflow
export interface WorkflowJobData {
  workflowId: string;
  triggerData: Record<string, unknown>;
}

// Connexion Redis partagée entre la queue et le worker
// Détecte rediss:// pour activer TLS (Render Redis en production)
function buildRedisConnection() {
  const url = new URL(config.redis.url);
  const tls = url.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined;
  return {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    password: url.password || undefined,
    tls,
  };
}

export const redisConnection = buildRedisConnection();

export const workflowQueue = new Queue<WorkflowJobData>('workflows', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    // Backoff exponentiel : 2s → 8s → 32s entre chaque tentative
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});
