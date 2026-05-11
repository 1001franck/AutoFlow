import { Client } from '@notionhq/client';
import { ConnectorAction } from './index';
import { decrypt } from '../utils/crypto';

// Crée une page dans une base de données Notion
const create_page: ConnectorAction = async (params, credential) => {
  if (!credential) throw new Error('notion.create_page : credential manquant');

  // Les données sont chiffrées en BDD — on déchiffre avant usage
  const { apiKey } = decrypt<{ apiKey: string }>(credential.data);
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
