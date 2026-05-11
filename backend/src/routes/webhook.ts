import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { workflowQueue } from '../engine/queue';

const router = Router();

// POST /webhook/:workflowId/:token
// Endpoint public — déclenche un workflow via un appel HTTP externe
router.post('/:workflowId/:token', async (req: Request, res: Response) => {
  const workflowId = req.params['workflowId'] as string;
  const token = req.params['token'] as string;

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });

  // On renvoie 401 dans tous les cas d'échec pour ne pas exposer si le workflow existe
  if (!workflow || workflow.webhookToken !== token) {
    res.status(401).json({ error: 'Token invalide' });
    return;
  }

  if (!workflow.active) {
    res.status(403).json({ error: 'Workflow inactif' });
    return;
  }

  // Le body de la requête devient le triggerData disponible via {{trigger.xxx}}
  await workflowQueue.add('trigger', {
    workflowId: workflow.id,
    triggerData: req.body ?? {},
  });

  res.json({ received: true });
});

export default router;
