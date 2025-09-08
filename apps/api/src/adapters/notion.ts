import { Client } from "@notionhq/client";
import { getEnv } from "../plugins/env";

export async function createNotionTask(title: string, extra?: { url?: string; source?: string; }) {
  const env = getEnv();
  if (!env.NOTION_TOKEN || !env.NOTION_INBOX_DB) {
    throw new Error("Notion is not configured");
  }
  const notion = new Client({ auth: env.NOTION_TOKEN });
  await notion.pages.create({
    parent: { database_id: env.NOTION_INBOX_DB },
    properties: {
      Name: { title: [{ text: { content: title.slice(0, 200) } }] },
      Source: extra?.source ? { rich_text: [{ text: { content: extra.source } }] } : undefined,
      Link: extra?.url ? { url: extra.url } : undefined,
    } as any,
  });
}


