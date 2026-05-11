import cron, { ScheduledTask } from 'node-cron';
import { prisma } from '../lib/prisma';
import { workflowQueue } from './queue';
import { pollInbox } from '../connectors/gmail';
import { decrypt } from '../utils/crypto';

// Stocke les historyId Gmail en mémoire — réinitialisés au redémarrage du serveur
const gmailHistoryIds = new Map<string, string | null>();

// Stocke les tâches cron actives pour pouvoir les stopper si un workflow est désactivé
const activeCronJobs = new Map<string, ScheduledTask>();

export async function startScheduler() {
  await scheduleCronWorkflows();
  await scheduleGmailPoll();
  console.log('Scheduleur cron démarré');
}

// Charge tous les workflows cron actifs et les programme
async function scheduleCronWorkflows() {
  const workflows = await prisma.workflow.findMany({
    where: { triggerType: 'cron', active: true },
  });

  for (const workflow of workflows) {
    registerCronJob(workflow.id, (workflow.triggerConfig as { cron: string }).cron);
  }
}

// Enregistre un job cron pour un workflow donné
export function registerCronJob(workflowId: string, cronExpression: string) {
  // Stoppe l'ancienne tâche si elle existait (ex: mise à jour du workflow)
  activeCronJobs.get(workflowId)?.stop();

  if (!cron.validate(cronExpression)) {
    console.warn(`Expression cron invalide pour le workflow ${workflowId} : ${cronExpression}`);
    return;
  }

  const task = cron.schedule(cronExpression, async () => {
    await workflowQueue.add('cron-trigger', {
      workflowId,
      triggerData: { firedAt: new Date().toISOString() },
    });
  });

  activeCronJobs.set(workflowId, task);
}

export function unregisterCronJob(workflowId: string) {
  activeCronJobs.get(workflowId)?.stop();
  activeCronJobs.delete(workflowId);
}

// Poll Gmail toutes les 5 minutes pour tous les workflows gmail_poll actifs
function scheduleGmailPoll() {
  cron.schedule('*/5 * * * *', async () => {
    const workflows = await prisma.workflow.findMany({
      where: { triggerType: 'gmail_poll', active: true },
    });

    for (const workflow of workflows) {
      try {
        const credential = await prisma.credential.findFirst({
          where: { userId: workflow.userId, connector: 'gmail' },
        });

        if (!credential) continue;

        const gmailCred = decrypt<{
          refreshToken: string;
          clientId: string;
          clientSecret: string;
        }>(credential.data);

        const filter = (workflow.triggerConfig as { filter?: { from?: string; subject?: string } }).filter ?? {};
        const lastHistoryId = gmailHistoryIds.get(workflow.id) ?? null;

        const { messages, newHistoryId } = await pollInbox(gmailCred, filter, lastHistoryId);

        // Mémorise le curseur pour le prochain poll
        gmailHistoryIds.set(workflow.id, newHistoryId);

        // Déclenche un job par email reçu
        for (const message of messages) {
          await workflowQueue.add('gmail-trigger', {
            workflowId: workflow.id,
            triggerData: message as Record<string, unknown>,
          });
        }
      } catch (err) {
        console.error(`Gmail poll échoué pour le workflow ${workflow.id} :`, err);
      }
    }
  });
}
