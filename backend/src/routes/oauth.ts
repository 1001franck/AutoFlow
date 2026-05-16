import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
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

function getOAuth2Client() {
  return new google.auth.OAuth2(
    config.gmail.clientId,
    config.gmail.clientSecret,
    config.gmail.redirectUri,
  );
}

// GET /auth/gmail/init — retourne l'URL d'autorisation Google (requiert JWT)
router.get('/gmail/init', requireAuth, (_req: Request, res: Response) => {
  const userId = (_req as unknown as AuthRequest).userId;

  // Encode le userId dans le state signé — vérifié au callback pour éviter le CSRF
  const state = jwt.sign({ userId }, config.jwt.secret, { expiresIn: '10m' });

  const url = getOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // force Google à retourner un refresh_token même si déjà autorisé
    scope: GMAIL_SCOPES,
    state,
  });

  res.json({ url });
});

// GET /auth/gmail/callback — Google redirige ici après autorisation de l'utilisateur
router.get('/gmail/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;
  const frontendUrl = config.cors.frontendUrl;

  if (error || !code || !state) {
    res.redirect(`${frontendUrl}/credentials?error=oauth_cancelled`);
    return;
  }

  // Vérifie le state signé pour récupérer le userId
  let userId: string;
  try {
    const decoded = jwt.verify(state, config.jwt.secret) as { userId: string };
    userId = decoded.userId;
  } catch {
    res.redirect(`${frontendUrl}/credentials?error=oauth_expired`);
    return;
  }

  const oauth2Client = getOAuth2Client();

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      // Peut arriver si l'utilisateur a déjà autorisé sans prompt=consent
      res.redirect(`${frontendUrl}/credentials?error=no_refresh_token`);
      return;
    }

    // Récupère l'adresse email Google de l'utilisateur
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

export default router;
