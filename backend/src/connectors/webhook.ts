import { ConnectorAction } from './index';

// Envoie une requête HTTP POST vers une URL externe (webhook sortant)
const http_post: ConnectorAction = async (params) => {
  const url = params['url'] as string;
  if (!url) throw new Error('webhook.http_post : url manquante');

  const headers = (params['headers'] as Record<string, string>) ?? {};
  const body = params['body'] ?? {};

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    ok: response.ok,
  };
};

export default { http_post };
