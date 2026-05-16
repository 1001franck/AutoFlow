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

    // Génère les tokens AutoFlow
    const accessToken = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    });
    const refreshToken = jwt.sign({ userId: user.id }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
    });

    res.cookie('refreshToken', refreshToken, cookieOptions());

    // Redirige vers la racine avec le signal googleAuth — App.tsx prend le relais
    res.redirect(`${frontendUrl}/?googleAuth=1&email=${encodeURIComponent(email)}&token=${encodeURIComponent(accessToken)}`);
  } catch {
    res.redirect(`${frontendUrl}/login?error=google_failed`);
  }
});

export default router;
