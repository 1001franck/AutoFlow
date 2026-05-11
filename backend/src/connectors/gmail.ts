import { google } from 'googleapis';
import { ConnectorAction } from './index';
import { config } from '../config';
import { decrypt } from '../utils/crypto';

interface GmailCredential {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

interface GmailPollFilter {
  from?: string;
  subject?: string;
}

// Construit un client OAuth2 authentifié à partir du credential stocké
function getOAuthClient(cred: GmailCredential) {
  const auth = new google.auth.OAuth2(
    cred.clientId || config.gmail.clientId,
    cred.clientSecret || config.gmail.clientSecret,
    config.gmail.redirectUri
  );
  auth.setCredentials({ refresh_token: cred.refreshToken });
  return auth;
}

// Envoie un email via l'API Gmail
export const send_email: ConnectorAction = async (params, credential) => {
  if (!credential) throw new Error('gmail.send_email : credential manquant');

  // Les données sont chiffrées en BDD — on déchiffre avant usage
  const cred = decrypt<GmailCredential>(credential.data);
  const auth = getOAuthClient(cred);
  const gmail = google.gmail({ version: 'v1', auth });

  const to = params['to'] as string;
  const subject = params['subject'] as string;
  const body = params['body'] as string;

  if (!to || !subject || !body) throw new Error('gmail.send_email : to, subject et body requis');

  // Encode l'email en base64url selon le format attendu par l'API Gmail
  const raw = Buffer.from(
    `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`
  )
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return { messageId: result.data.id };
};

// Récupère les nouveaux emails depuis le dernier historyId connu
// historyId : identifiant Gmail qui permet de ne récupérer que les messages depuis le dernier poll
export async function pollInbox(
  credential: GmailCredential,
  filter: GmailPollFilter,
  lastHistoryId: string | null
): Promise<{ messages: unknown[]; newHistoryId: string | null }> {
  const auth = getOAuthClient(credential);
  const gmail = google.gmail({ version: 'v1', auth });

  // Premier appel : on récupère le historyId actuel pour initialiser le curseur
  if (!lastHistoryId) {
    const profile = await gmail.users.getProfile({ userId: 'me' });
    return { messages: [], newHistoryId: profile.data.historyId ?? null };
  }

  const history = await gmail.users.history.list({
    userId: 'me',
    startHistoryId: lastHistoryId,
    historyTypes: ['messageAdded'],
  });

  const messages: unknown[] = [];
  const records = history.data.history ?? [];

  for (const record of records) {
    for (const added of record.messagesAdded ?? []) {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: added.message?.id ?? '',
        format: 'metadata',
        metadataHeaders: ['From', 'Subject'],
      });

      const headers = msg.data.payload?.headers ?? [];
      const from = headers.find((h) => h.name === 'From')?.value ?? '';
      const subject = headers.find((h) => h.name === 'Subject')?.value ?? '';

      // Applique les filtres configurés sur le workflow
      if (filter.from && !from.includes(filter.from)) continue;
      if (filter.subject && !subject.includes(filter.subject)) continue;

      messages.push({ id: msg.data.id, from, subject, threadId: msg.data.threadId });
    }
  }

  return {
    messages,
    newHistoryId: history.data.historyId ?? lastHistoryId,
  };
}

export default { send_email };
