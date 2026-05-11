import { Client } from '@notionhq/client';
import { ConnectorAction } from './index';

// Crée une page dans une base de données Notion
const create_page: ConnectorAction = async (params, credential) => {
  if (!credential) throw new Error('notion.create_page : credential manquant');

  const { apiKey } = JSON.parse(credential.data) as { apiKey: string };
  const databaseId = params['databaseId'] as string;
  const properties = params['properties'] as Record<string, unknown>;

  if (!databaseId) throw new Error('notion.create_page : databaseId requis');

  const notion = new Client({ auth: apiKey });

  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: properties as Parameters<typeof notion.pages.create>[0]['properties'],
  });

  return { pageId: page.id, url: 'url' in page ? page.url : null };
};

export default { create_page };
