import { Router, Request, Response } from 'express';
import * as authService from '../services/auth.service';

const router = Router();

const REFRESH_COOKIE = 'refresh_token';

// Cookie httpOnly : inaccessible depuis le JS client, protège contre le vol de token XSS
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
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
    const result = await authService.register(email, password);
    res.status(201).json(result);
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

// POST /auth/logout — supprime le cookie de refresh token
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE);
  res.json({ message: 'Déconnecté' });
});

export default router;
