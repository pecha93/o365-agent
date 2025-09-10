import { PrismaClient } from '@prisma/client';
import { getSecret, getDefaultUser } from './secrets';

export async function getEnvWithSecrets(prisma: PrismaClient) {
  const userId = await getDefaultUser(prisma);

  // Get secrets from database
  const telegramBotToken = await getSecret(prisma, userId, 'TELEGRAM_BOT_TOKEN');
  const telegramChatId = await getSecret(prisma, userId, 'TELEGRAM_CHAT_ID');
  const notionToken = await getSecret(prisma, userId, 'NOTION_TOKEN');
  const notionInboxDb = await getSecret(prisma, userId, 'NOTION_INBOX_DB');
  const notionNameProp = await getSecret(prisma, userId, 'NOTION_NAME_PROP');
  const notionSourceProp = await getSecret(prisma, userId, 'NOTION_SOURCE_PROP');
  const notionLinkProp = await getSecret(prisma, userId, 'NOTION_LINK_PROP');
  const openaiApiKey = await getSecret(prisma, userId, 'OPENAI_API_KEY');
  const msTenantId = await getSecret(prisma, userId, 'MS_TENANT_ID');
  const msClientId = await getSecret(prisma, userId, 'MS_CLIENT_ID');
  const msClientSecret = await getSecret(prisma, userId, 'MS_CLIENT_SECRET');
  const msAppId = await getSecret(prisma, userId, 'MS_APP_ID');
  const msAppSecret = await getSecret(prisma, userId, 'MS_APP_SECRET');
  const msScopes = await getSecret(prisma, userId, 'MS_SCOPES');

  return {
    TELEGRAM_BOT_TOKEN: telegramBotToken,
    TELEGRAM_CHAT_ID: telegramChatId,
    NOTION_TOKEN: notionToken,
    NOTION_INBOX_DB: notionInboxDb,
    NOTION_NAME_PROP: notionNameProp,
    NOTION_SOURCE_PROP: notionSourceProp,
    NOTION_LINK_PROP: notionLinkProp,
    OPENAI_API_KEY: openaiApiKey,
    MS_TENANT_ID: msTenantId,
    MS_CLIENT_ID: msClientId,
    MS_CLIENT_SECRET: msClientSecret,
    MS_APP_ID: msAppId,
    MS_APP_SECRET: msAppSecret,
    MS_SCOPES: msScopes,
  };
}
