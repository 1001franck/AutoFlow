import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { encrypt } from '../utils/crypto';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

const SIGNIN_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
];

// Client OAuth2 pour la connexion du credential Gmail
function getGmailOAuth2Client() {
  return new google.auth.OAuth2(
    config.gmail.clientId,
    config.gmail.clientSecret,
    config.gmail.redirectUri,
  );
}

// Client OAuth2 pour le Sign-In Google (redirect URI différent)
function getSignInOAuth2Client() {
  return new google.auth.OAuth2(
    config.gmail.clientId,
    config.gmail.clientSecret,
    config.google.signinRedirectUri,
  );
}

function cookieOptions() {
  const prod = config.nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: prod,
    sameSite: (prod ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

// ── Gmail credential OAuth ─────────────────────────────────────────────────

// GET /auth/gmail/init — retourne l'URL d'autorisation Google (requiert JWT)
router.get('/gmail/init', requireAuth, (_req: Request, res: Response) => {
  const userId = (_req as unknown as AuthRequest).userId;

  const state = jwt.sign({ userId }, config.jwt.secret, { expiresIn: '10m' });

  const url = getGmailOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GMAIL_SCOPES,
    state,
  });

  res.json({ url });
});

// GET /auth/gmail/callback — Google redirige ici après autorisation du credential Gmail
router.get('/gmail/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;
  const frontendUrl = config.cors.frontendUrl;

  if (error || !code || !state) {
    res.redirect(`${frontendUrl}/credentials?error=oauth_cancelled`);
    return;
  }

  let userId: string;
  try {
    const decoded = jwt.verify(state, config.jwt.secret) as { userId: string };
    userId = decoded.userId;
  } catch {
    res.redirect(`${frontendUrl}/credentials?error=oauth_expired`);
    return;
  }

  const oauth2Client = getGmailOAuth2Client();

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      res.redirect(`${frontendUrl}/credentials?error=no_refresh_token`);
      return;
    }

    oauth2Client.setCredentials(tokens);
    const { data: userInfo } = await google.oauth2({ version: 'v2', auth: oauth2Client }).userinfo.get();
    const email = userInfo.email ?? 'gmail';

    await prisma.credential.create({
      data: {
        userId,
        connector: 'gmail',
        label: `Gmail — ${email}`,
        data: encrypt({
          clientId: config.gmail.clientId,
          clientSecret: config.gmail.clientSecret,
          refreshToken: tokens.refresh_token,
          email,
        }),
      },
    });

    res.redirect(`${frontendUrl}/credentials?gmailConnected=1`);
  } catch {
    res.redirect(`${frontendUrl}/credentials?error=oauth_failed`);
  }
});

// ── Google Sign-In (authentification AutoFlow) ─────────────────────────────

// GET /auth/google/signin/init — retourne l'URL Google Sign-In (sans auth requise)
router.get('/google/signin/init', (_req: Request, res: Response) => {
  const state = jwt.sign({ type: 'signin' }, config.jwt.secret, { expiresIn: '10m' });

  const url = getSignInOAuth2Client().generateAuthUrl({
    access_type: 'online',
    scope: SIGNIN_SCOPES,
    state,
  });

  res.json({ url });
});

// GET /auth/google/signin/callback — Google redirige ici après Sign-In
router.get('/google/signin/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;
  const frontendUrl = config.cors.frontendUrl;

  if (error || !code || !state) {
    res.redirect(`${frontendUrl}/login?error=google_cancelled`);
    return;
  }

  try {
    jwt.verify(state, config.jwt.secret);
  } catch {
    res.redirect(`${frontendUrl}/login?error=google_expired`);
    return;
  }

  try {
    const oauth2Client = getSignInOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const { data: userInfo } = await google.oauth2({ version: 'v2', auth: oauth2Client }).userinfo.get();
    const email = userInfo.email;

    if (!email) {
      res.redirect(`${frontendUrl}/login?error=google_failed`);
      return;
    }

    // Trouve l'utilisateur existant ou en crée un nouveau
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      user = await prisma.user.create({ data: { email, password: randomPassword } });
    }

    // Code d'échange court-vécu (2 min) — le frontend l'échange via XHR pour obtenir le cookie
    const exchangeCode = jwt.sign(
      { userId: user.id, email, type: 'google_exchange' },
      config.jwt.secret,
      { expiresIn: '2m' },
    );

    res.redirect(`${frontendUrl}/?googleOAuth=1&code=${encodeURIComponent(exchangeCode)}&email=${encodeURIComponent(email)}`);
  } catch {
    res.redirect(`${frontendUrl}/login?error=google_failed`);
  }
});

// POST /auth/google/signin/exchange — échange le code contre un vrai cookie + access token
// Appelé par le frontend via XHR (withCredentials) — le cookie est posé dans cette réponse XHR
router.post('/google/signin/exchange', async (req: Request, res: Response) => {
  const { code } = req.body as { code?: string };

  if (!code) {
    res.status(400).json({ error: 'code requis' });
    return;
  }

  let payload: { userId: string; email: string; type: string };
  try {
    payload = jwt.verify(code, config.jwt.secret) as { userId: string; email: string; type: string };
    if (payload.type !== 'google_exchange') throw new Error('type invalide');
  } catch {
    res.status(400).json({ error: 'code invalide ou expiré' });
    return;
  }

  const accessToken = jwt.sign({ userId: payload.userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign({ userId: payload.userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });

  // Cookie posé dans la réponse XHR — fiable en cross-origin avec withCredentials
  res.cookie('refresh_token', refreshToken, cookieOptions());
  res.json({ accessToken, email: payload.email });
});

// POST /auth/google/mobile — vérifie un access token Google depuis l'app mobile
router.post('/google/mobile', async (req: Request, res: Response) => {
  const { accessToken: googleToken } = req.body as { accessToken?: string };

  if (!googleToken) {
    res.status(400).json({ error: 'accessToken requis' });
    return;
  }

  // Vérifie le token auprès de Google
  const tokenInfo = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${googleToken}`);
  const info = await tokenInfo.json() as { email?: string; error?: string };

  if (!info.email) {
    res.status(401).json({ error: 'Token Google invalide' });
    return;
  }

  let user = await prisma.user.findUnique({ where: { email: info.email } });
  if (!user) {
    const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    user = await prisma.user.create({ data: { email: info.email, password: randomPassword } });
  }

  const accessToken = jwt.sign({ userId: user.id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign({ userId: user.id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });

  res.cookie('refresh_token', refreshToken, cookieOptions());
  res.json({ accessToken, email: user.email });
});

export default router;
