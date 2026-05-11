import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Step } from '../generated/prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { generateWebhookToken } from '../utils/crypto';
import { workflowQueue } from '../engine/queue';
import { registerCronJob, unregisterCronJob } from '../engine/cron';

interface RawStep {
  type: string;           // ex: 'discord.send_message'
  order: number;
  config: Record<string, string>;
}

// Transforme le format frontend (type + order) vers le format BDD (connector + action + position)
// Extrait aussi credentialId depuis le config pour le placer au bon niveau
function normalizeSteps(steps: RawStep[]) {
  return steps.map(({ type, order, config }) => {
    const [connector, action] = type.split('.');
    const { credentialId, ...restConfig } = config ?? {};
    return {
      position: order,
      connector: connector ?? '',
      action: action ?? '',
      config: restConfig,
      credentialId: credentialId || null,
    };
  });
}

const router = Router();
router.use(requireAuth);

// GET /workflows — liste tous les workflows de l'user
router.get('/', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;

  const workflows = await prisma.workflow.findMany({
    where: { userId },
    include: { _count: { select: { runs: true, steps: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json(workflows);
});

// POST /workflows — crée un nouveau workflow
router.post('/', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;
  const { name, description, triggerType, triggerConfig, steps } = req.body;

  if (!name || !triggerType || !triggerConfig) {
    res.status(400).json({ error: 'name, triggerType et triggerConfig requis' });
    return;
  }

  // Génère un token webhook unique si le trigger est de type webhook
  const webhookToken = triggerType === 'webhook' ? generateWebhookToken() : undefined;

  const workflow = await prisma.workflow.create({
    data: {
      userId,
      name,
      description,
      triggerType,
      triggerConfig,
      webhookToken,
      steps: steps
        ? { create: normalizeSteps(steps) }
        : undefined,
    },
    include: { steps: { orderBy: { position: 'asc' } } },
  });

  // Enregistre le job cron si le trigger est planifié
  if (triggerType === 'cron') {
    registerCronJob(workflow.id, (triggerConfig as { cron: string }).cron);
  }

  res.status(201).json(workflow);
});

// GET /workflows/:id — détail d'un workflow avec ses steps
router.get('/:id', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;
  const id = req.params['id'] as string;

  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: { steps: { orderBy: { position: 'asc' } } },
  });

  if (!workflow || workflow.userId !== userId) {
    res.status(404).json({ error: 'Workflow introuvable' });
    return;
  }

  res.json(workflow);
});

// PUT /workflows/:id — met à jour un workflow et ses steps
router.put('/:id', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;
  const id = req.params['id'] as string;
  const { name, description, triggerType, triggerConfig, steps } = req.body;

  const existing = await prisma.workflow.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    res.status(404).json({ error: 'Workflow introuvable' });
    return;
  }

  const workflow = await prisma.workflow.update({
    where: { id },
    data: {
      name,
      description,
      triggerType,
      triggerConfig,
      version: { increment: 1 },
      // Remplace tous les steps existants par les nouveaux
      steps: steps
        ? { deleteMany: {}, create: normalizeSteps(steps) }
        : undefined,
    },
    include: { steps: { orderBy: { position: 'asc' } } },
  });

  // Resynchronise le cron si l'expression a changé
  if (triggerType === 'cron') {
    registerCronJob(workflow.id, (triggerConfig as { cron: string }).cron);
  } else {
    unregisterCronJob(workflow.id);
  }

  res.json(workflow);
});

// DELETE /workflows/:id
router.delete('/:id', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;
  const id = req.params['id'] as string;

  const existing = await prisma.workflow.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    res.status(404).json({ error: 'Workflow introuvable' });
    return;
  }

  unregisterCronJob(id);
  await prisma.workflow.delete({ where: { id } });
  res.status(204).send();
});

// PATCH /workflows/:id/toggle — active ou désactive un workflow
router.patch('/:id/toggle', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;
  const id = req.params['id'] as string;

  const existing = await prisma.workflow.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    res.status(404).json({ error: 'Workflow introuvable' });
    return;
  }

  const workflow = await prisma.workflow.update({
    where: { id },
    data: { active: !existing.active },
  });

  // Synchronise le cron avec l'état actif/inactif
  if (workflow.triggerType === 'cron') {
    if (workflow.active) {
      registerCronJob(workflow.id, (workflow.triggerConfig as { cron: string }).cron);
    } else {
      unregisterCronJob(workflow.id);
    }
  }

  res.json(workflow);
});

// POST /workflows/:id/run — déclenche manuellement un workflow
router.post('/:id/run', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;
  const id = req.params['id'] as string;

  const workflow = await prisma.workflow.findUnique({ where: { id } });
  if (!workflow || workflow.userId !== userId) {
    res.status(404).json({ error: 'Workflow introuvable' });
    return;
  }

  await workflowQueue.add('manual-trigger', {
    workflowId: id,
    triggerData: { manual: true, triggeredAt: new Date().toISOString() },
  });

  res.json({ queued: true });
});

// POST /workflows/:id/duplicate — duplique un workflow avec ses steps
router.post('/:id/duplicate', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;
  const id = req.params['id'] as string;

  const source = await prisma.workflow.findUnique({
    where: { id },
    include: { steps: { orderBy: { position: 'asc' } } },
  });

  if (!source || source.userId !== userId) {
    res.status(404).json({ error: 'Workflow introuvable' });
    return;
  }

  const duplicate = await prisma.workflow.create({
    data: {
      userId,
      name: `${source.name} (copie)`,
      description: source.description,
      triggerType: source.triggerType,
      triggerConfig: source.triggerConfig as object,
      webhookToken: source.triggerType === 'webhook' ? generateWebhookToken() : undefined,
      active: false, // La copie démarre toujours inactive
      steps: {
        create: source.steps.map(({ position, connector, action, config, credentialId }: Step) => ({
          position,
          connector,
          action,
          config: config as object,
          credentialId,
        })),
      },
    },
    include: { steps: { orderBy: { position: 'asc' } } },
  });

  res.status(201).json(duplicate);
});

export default router;
