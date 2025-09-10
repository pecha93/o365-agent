import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  getSecret,
  setSecret,
  deleteSecret,
  listSecrets,
  getDefaultUser,
} from '../services/secrets';

const setSecretSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export async function secretsRoutes(app: FastifyInstance) {
  // List all secrets (keys only, no values)
  app.get('/secrets', async () => {
    const userId = await getDefaultUser(app.prisma);
    return listSecrets(app.prisma, userId);
  });

  // Get a specific secret value
  app.get<{ Params: { key: string } }>('/secrets/:key', async (req, reply) => {
    const userId = await getDefaultUser(app.prisma);
    const value = await getSecret(app.prisma, userId, req.params.key);

    if (value === null) {
      reply.code(404);
      return { error: 'Secret not found' };
    }

    return { key: req.params.key, value };
  });

  // Set or update a secret
  app.post('/secrets', async (req, reply) => {
    const parsed = setSecretSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'Invalid body', issues: parsed.error.issues };
    }

    const userId = await getDefaultUser(app.prisma);
    await setSecret(app.prisma, userId, parsed.data.key, parsed.data.value);

    reply.code(201);
    return { key: parsed.data.key, success: true };
  });

  // Delete a secret
  app.delete<{ Params: { key: string } }>('/secrets/:key', async (req, reply) => {
    const userId = await getDefaultUser(app.prisma);

    try {
      await deleteSecret(app.prisma, userId, req.params.key);
      reply.code(204);
      return null;
    } catch (error) {
      reply.code(404);
      return { error: 'Secret not found' };
    }
  });

  // Test secret connectivity (for external services)
  app.post<{ Params: { key: string } }>('/secrets/:key/test', async (req, reply) => {
    const userId = await getDefaultUser(app.prisma);
    const value = await getSecret(app.prisma, userId, req.params.key);

    if (!value) {
      reply.code(404);
      return { error: 'Secret not found' };
    }

    // Test different services based on key
    try {
      switch (req.params.key) {
        case 'TELEGRAM_BOT_TOKEN': {
          const telegramUrl = `https://api.telegram.org/bot${value}/getMe`;
          const telegramRes = await fetch(telegramUrl);
          if (!telegramRes.ok) {
            throw new Error(`Telegram API error: ${telegramRes.status}`);
          }
          return { success: true, service: 'telegram', data: await telegramRes.json() };
        }

        case 'NOTION_TOKEN': {
          const notionUrl = 'https://api.notion.com/v1/users/me';
          const notionRes = await fetch(notionUrl, {
            headers: {
              Authorization: `Bearer ${value}`,
              'Notion-Version': '2022-06-28',
            },
          });
          if (!notionRes.ok) {
            throw new Error(`Notion API error: ${notionRes.status}`);
          }
          return { success: true, service: 'notion', data: await notionRes.json() };
        }

        case 'OPENAI_API_KEY': {
          const openaiUrl = 'https://api.openai.com/v1/models';
          const openaiRes = await fetch(openaiUrl, {
            headers: {
              Authorization: `Bearer ${value}`,
            },
          });
          if (!openaiRes.ok) {
            throw new Error(`OpenAI API error: ${openaiRes.status}`);
          }
          return { success: true, service: 'openai', data: await openaiRes.json() };
        }

        default:
          reply.code(400);
          return { error: 'Unknown service for testing' };
      }
    } catch (error) {
      reply.code(400);
      return {
        error: 'Connection test failed',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  });
}
