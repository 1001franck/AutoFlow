import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { interpolate, ExecutionContext } from './interpolate';
import { redisConnection, WorkflowJobData } from './queue';
import { connectors } from '../connectors';
import { emitToUser } from '../lib/socket';

// Prisma 7 exige InputJsonValue pour les champs Json — ce cast évite la verbosité partout
const toJson = (v: unknown) => v as unknown as Prisma.InputJsonValue;

export function startWorker() {
  const worker = new Worker<WorkflowJobData>(
    'workflows',
    async (job: Job<WorkflowJobData>) => processJob(job),
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} terminé`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} échoué :`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Worker erreur Redis :', err.message);
  });

  console.log('Worker BullMQ démarré');
  return worker;
}

async function processJob(job: Job<WorkflowJobData>) {
  const { workflowId, triggerData } = job.data;
  const startedAt = Date.now();

  // Vérifie que le workflow existe et est actif
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: { steps: { orderBy: { position: 'asc' } } },
  });

  if (!workflow || !workflow.active) return;

  // Crée le run en BDD — point d'entrée de l'historique d'exécution
  const run = await prisma.run.create({
    data: { workflowId, status: 'running', triggerData: toJson(triggerData) },
  });

  const context: ExecutionContext = {
    trigger: triggerData,
    steps: {},
  };

  let globalStatus: 'success' | 'failed' | 'partial' = 'success';

  for (const step of workflow.steps) {
    const stepStart = Date.now();

    // Résout les {{variables}} dans la config du step avec le contexte courant
    const resolvedConfig = interpolate(step.config, context) as Record<string, unknown>;

    try {
      const connector = connectors[step.connector];
      if (!connector) throw new Error(`Connecteur inconnu : ${step.connector}`);

      const action = connector[step.action];
      if (!action) throw new Error(`Action inconnue : ${step.connector}.${step.action}`);

      // Charge le credential si le step en a besoin
      const credential = step.credentialId
        ? await prisma.credential.findUnique({ where: { id: step.credentialId } })
        : null;

      const output = await action(resolvedConfig, credential ?? undefined);

      // Stocke l'output dans le contexte pour les steps suivants ({{steps.N.output.xxx}})
      context.steps[step.position] = { output };

      await prisma.stepLog.create({
        data: {
          runId: run.id,
          stepId: step.id,
          position: step.position,
          status: 'success',
          input: toJson(resolvedConfig),
          output: toJson(output),
          durationMs: Date.now() - stepStart,
        },
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error(`Step ${step.connector}.${step.action} échoué :`, error);
      globalStatus = globalStatus === 'success' ? 'partial' : 'failed';

      await prisma.stepLog.create({
        data: {
          runId: run.id,
          stepId: step.id,
          position: step.position,
          status: 'failed',
          input: toJson(resolvedConfig),
          error,
          durationMs: Date.now() - stepStart,
        },
      });
    }
  }

  // Met à jour le run avec le statut final et la durée totale
  const finishedRun = await prisma.run.update({
    where: { id: run.id },
    data: {
      status: globalStatus,
      finishedAt: new Date(),
      durationMs: Date.now() - startedAt,
    },
  });

  // Notifie le frontend en temps réel — le client écoute l'event 'run:update'
  emitToUser(workflow.userId, 'run:update', {
    runId: finishedRun.id,
    workflowId,
    status: globalStatus,
    durationMs: finishedRun.durationMs,
  });
}
