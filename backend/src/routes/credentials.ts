import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { encrypt, decrypt } from '../utils/crypto';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /credentials — liste les credentials sans exposer les données chiffrées
router.get('/', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;

  const credentials = await prisma.credential.findMany({
    where: { userId },
    select: { id: true, connector: true, label: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json(credentials);
});

// POST /credentials — chiffre et stocke un nouveau credential
router.post('/', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;
  const { connector, label, data } = req.body;

  if (!connector || !label || !data) {
    res.status(400).json({ error: 'connector, label et data requis' });
    return;
  }

  const credential = await prisma.credential.create({
    data: { userId, connector, label, data: encrypt(data) },
    select: { id: true, connector: true, label: true, createdAt: true },
  });

  res.status(201).json(credential);
});

// DELETE /credentials/:id
router.delete('/:id', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;
  const id = req.params['id'] as string;

  const credential = await prisma.credential.findUnique({ where: { id } });

  if (!credential || credential.userId !== userId) {
    res.status(404).json({ error: 'Credential introuvable' });
    return;
  }

  await prisma.credential.delete({ where: { id } });
  res.status(204).send();
});

// GET /credentials/:id/test — déchiffre et renvoie les clés (sans valeurs) pour vérification
router.get('/:id/test', async (req, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;
  const id = req.params['id'] as string;

  const credential = await prisma.credential.findUnique({ where: { id } });

  if (!credential || credential.userId !== userId) {
    res.status(404).json({ error: 'Credential introuvable' });
    return;
  }

  const decrypted = decrypt(credential.data);
  // Retourne uniquement les clés présentes, pas les valeurs — confirm que le déchiffrement fonctionne
  res.json({ connector: credential.label, keys: Object.keys(decrypted) });
});

export default router;
