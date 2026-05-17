import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// POST /push-token — enregistre ou met à jour le token Expo de l'utilisateur
router.post('/push-token', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;
  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'token requis' });
    return;
  }

  await prisma.user.update({ where: { id: userId }, data: { pushToken: token } });
  res.json({ ok: true });
});

// DELETE /push-token — supprime le token (déconnexion)
router.delete('/push-token', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;
  await prisma.user.update({ where: { id: userId }, data: { pushToken: null } });
  res.json({ ok: true });
});

export default router;
