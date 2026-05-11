import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /runs — tous les runs de l'user, paginés et avec le nom du workflow
router.get('/runs', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;
  const page = parseInt(req.query['page'] as string) || 1;
  const limit = parseInt(req.query['limit'] as string) || 30;

  const [runs, total] = await Promise.all([
    prisma.run.findMany({
      where: { workflow: { userId } },
      include: { workflow: { select: { name: true } } },
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.run.count({ where: { workflow: { userId } } }),
  ]);

  res.json({ runs, total, page, limit });
});

// GET /workflows/:workflowId/runs — historique paginé des runs d'un workflow
router.get('/workflows/:workflowId/runs', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;
  const workflowId = req.params['workflowId'] as string;
  const page = parseInt(req.query['page'] as string) || 1;
  const limit = parseInt(req.query['limit'] as string) || 20;

  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow || workflow.userId !== userId) {
    res.status(404).json({ error: 'Workflow introuvable' });
    return;
  }

  const [runs, total] = await Promise.all([
    prisma.run.findMany({
      where: { workflowId },
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.run.count({ where: { workflowId } }),
  ]);

  res.json({ runs, total, page, limit });
});

// GET /runs/:runId — détail complet d'un run avec ses step logs
router.get('/runs/:runId', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;
  const runId = req.params['runId'] as string;

  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      stepLogs: { orderBy: { position: 'asc' } },
      workflow: { select: { userId: true, name: true } },
    },
  });

  // Vérifie que le run appartient bien à l'user connecté
  if (!run || run.workflow.userId !== userId) {
    res.status(404).json({ error: 'Run introuvable' });
    return;
  }

  res.json(run);
});

export default router;
