import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import * as authService from '../services/auth.service';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const REFRESH_COOKIE = 'refresh_token';

// Cookie httpOnly : inaccessible depuis le JS client, protège contre le vol de token XSS
const isProd = process.env.NODE_ENV === 'production';

// En production : sameSite 'none' requis pour les requêtes cross-origin (Vercel → Render)
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email et mot de passe requis' });
    return;
  }

  try {
    const { user, accessToken, refreshToken } = await authService.register(email, password);
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    res.status(201).json({ user, accessToken });
  } catch (err) {
    if (err instanceof Error && err.message === 'EMAIL_TAKEN') {
      res.status(409).json({ error: 'Email déjà utilisé' });
      return;
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /auth/login — retourne l'access token dans le body, le refresh token en cookie
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email et mot de passe requis' });
    return;
  }

  try {
    const { user, accessToken, refreshToken } = await authService.login(email, password);
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    res.json({ user, accessToken });
  } catch (err) {
    if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: 'Identifiants incorrects' });
      return;
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /auth/refresh — renouvelle l'access token via le refresh token en cookie
router.post('/refresh', (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];

  if (!refreshToken) {
    res.status(401).json({ error: 'Refresh token manquant' });
    return;
  }

  try {
    const accessToken = authService.refreshAccessToken(refreshToken);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Refresh token invalide ou expiré' });
  }
});

// PATCH /auth/password — change le mot de passe de l'utilisateur connecté
router.patch('/password', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as unknown as AuthRequest).userId;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword et newPassword requis' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) { res.status(404).json({ error: 'Utilisateur introuvable' }); return; }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) { res.status(401).json({ error: 'Mot de passe actuel incorrect' }); return; }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

  res.json({ message: 'Mot de passe mis à jour' });
});

// POST /auth/logout — supprime le cookie de refresh token
router.post('/logout', (_req: Request, res: Response) => {
  // Les options doivent correspondre exactement à celles utilisées lors de la création
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  });
  res.json({ message: 'Déconnecté' });
});

export default router;
