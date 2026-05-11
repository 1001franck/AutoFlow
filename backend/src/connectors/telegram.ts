import { ConnectorAction } from './index';

// Envoie un message via un bot Telegram
const send_message: ConnectorAction = async (params, credential) => {
  if (!credential) throw new Error('telegram.send_message : credential manquant');

  const { botToken } = JSON.parse(credential.data) as { botToken: string };
  const chatId = params['chatId'] as string;
  const message = params['message'] as string;
  const parseMode = (params['parseMode'] as string) ?? 'Markdown';

  if (!chatId || !message) throw new Error('telegram.send_message : chatId et message requis');

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: parseMode }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`telegram.send_message : ${response.status} — ${error}`);
  }

  const data = await response.json() as { result: { message_id: number } };
  return { messageId: data.result.message_id };
};

export default { send_message };
