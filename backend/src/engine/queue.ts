import { Queue } from 'bullmq';
import { config } from '../config';

// Données transmises au worker lors du déclenchement d'un workflow
export interface WorkflowJobData {
  workflowId: string;
  triggerData: Record<string, unknown>;
}

// Connexion Redis partagée entre la queue et le worker
export const redisConnection = {
  url: config.redis.url,
};

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
