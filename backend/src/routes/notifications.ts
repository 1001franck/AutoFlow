import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /notifications — liste des notifications de l'utilisateur (50 max, non lues en premier)
router.get('/notifications', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  res.json({ notifications, unreadCount });
});

// PATCH /notifications/:id/read — marque une notification comme lue
router.patch('/notifications/:id/read', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;
  const { id } = req.params;

  const notification = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notification) { res.status(404).json({ error: 'Introuvable' }); return; }

  await prisma.notification.update({ where: { id }, data: { read: true } });
  res.json({ ok: true });
});

// PATCH /notifications/read-all — marque toutes les notifications comme lues
router.patch('/notifications/read-all', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;

  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  res.json({ ok: true });
});

export default router;
