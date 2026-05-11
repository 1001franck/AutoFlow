import { ConnectorAction } from './index';
import { decrypt } from '../utils/crypto';

// Envoie un message dans un salon Discord via l'API bot
const send_message: ConnectorAction = async (params, credential) => {
  if (!credential) throw new Error('discord.send_message : credential manquant');

  const { botToken } = decrypt<{ botToken: string }>(credential.data);
  const channelId = params['channelId'] as string;
  const message = params['message'] as string;

  if (!channelId || !message) throw new Error('discord.send_message : channelId et message requis');

  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: message }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`discord.send_message : ${response.status} — ${error}`);
  }

  const data = await response.json() as { id: string };
  return { messageId: data.id };
};

export default { send_message };
