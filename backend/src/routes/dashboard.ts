import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

type RunSummary = { startedAt: Date; status: string };
type WorkflowWithCount = { id: string; name: string; active: boolean; _count: { runs: number } };

const router = Router();
router.use(requireAuth);

// GET /dashboard/stats — métriques globales pour l'écran d'accueil
router.get('/stats', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;

  const days = Math.min(parseInt(req.query['days'] as string) || 7, 90);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [totalRuns, successRuns, activeWorkflows, runsLast7Days, topWorkflows] = await Promise.all([
    prisma.run.count({ where: { workflow: { userId } } }),

    prisma.run.count({ where: { workflow: { userId }, status: 'success' } }),

    prisma.workflow.count({ where: { userId, active: true } }),

    // Nombre de runs par jour sur 7 jours — groupé côté JS pour éviter du SQL raw
    prisma.run.findMany({
      where: { workflow: { userId }, startedAt: { gte: since } },
      select: { startedAt: true, status: true },
    }),

    // Top 5 workflows par nombre d'exécutions
    prisma.workflow.findMany({
      where: { userId },
      include: { _count: { select: { runs: true } } },
      orderBy: { runs: { _count: 'desc' } },
      take: 5,
    }),
  ]);

  const successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0;

  // Regroupe les runs par date (YYYY-MM-DD) pour le graphique
  const runsByDay = runsLast7Days.reduce<Record<string, number>>((acc: Record<string, number>, run: RunSummary) => {
    const day = run.startedAt.toISOString().slice(0, 10);
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {});

  res.json({
    totalRuns,
    successRate,
    activeWorkflows,
    runsLast7Days: Object.entries(runsByDay).map(([date, count]) => ({ date, count })),
    topWorkflows: topWorkflows.map((w: WorkflowWithCount) => ({
      id: w.id,
      name: w.name,
      runs: w._count.runs,
      active: w.active,
    })),
  });
});

export default router;
