import { Client } from '@notionhq/client';
import { getEnv } from '../plugins/env';

type NotionProps = {
  title: string;
  source?: string;
  url?: string;
};

async function withRetry<T>(fn: () => Promise<T>, tries = 3, delayMs = 1000): Promise<T> {
  let lastErr: Error;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      const error = e as Error & { status?: number; statusCode?: number };
      const status = error?.status || error?.statusCode;
      if (status === 429 || status === 503) {
        const wait = Math.min(delayMs * Math.pow(2, i), 8000);
        console.log(`Notion rate limit hit, waiting ${wait}ms before retry ${i + 1}/${tries}`);
        await new Promise((r) => setTimeout(r, wait));
        lastErr = error;
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

export async function createNotionTask(props: NotionProps) {
  const env = getEnv();
  if (!env.NOTION_TOKEN || !env.NOTION_INBOX_DB) {
    throw new Error('Notion is not configured');
  }
  const NAME = env.NOTION_NAME_PROP || 'Name';
  const SOURCE = env.NOTION_SOURCE_PROP || 'Source';
  const LINK = env.NOTION_LINK_PROP || 'Link';

  const notion = new Client({ auth: env.NOTION_TOKEN });

  const resp = await withRetry(() =>
    notion.pages.create({
      parent: { database_id: env.NOTION_INBOX_DB },
      properties: {
        [NAME]: { title: [{ text: { content: props.title.slice(0, 200) } }] },
        ...(props.source ? { [SOURCE]: { rich_text: [{ text: { content: props.source } }] } } : {}),
        ...(props.url ? { [LINK]: { url: props.url } } : {}),
      } as Record<string, unknown>,
    }),
  );

  // вернём id и публичный URL страницы (url в ответе Notion есть)
  const response = resp as { id: string; url: string };
  return { id: response.id, url: response.url };
}
