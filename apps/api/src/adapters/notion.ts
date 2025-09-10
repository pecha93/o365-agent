import { Client } from '@notionhq/client';
import { PrismaClient } from '@prisma/client';
import { getSecret, getDefaultUser } from '../services/secrets';

export async function createNotionTask(
  prisma: PrismaClient,
  title: string,
  extra?: { url?: string; source?: string },
) {
  const userId = await getDefaultUser(prisma);
  const notionToken = await getSecret(prisma, userId, 'NOTION_TOKEN');
  const notionInboxDb = await getSecret(prisma, userId, 'NOTION_INBOX_DB');

  if (!notionToken || !notionInboxDb) {
    throw new Error('Notion is not configured');
  }

  const notion = new Client({ auth: notionToken });
  await notion.pages.create({
    parent: { database_id: notionInboxDb },
    properties: {
      Name: { title: [{ text: { content: title.slice(0, 200) } }] },
      Source: extra?.source ? { rich_text: [{ text: { content: extra.source } }] } : undefined,
      Link: extra?.url ? { url: extra.url } : undefined,
    } as Record<string, unknown>,
  });
}
