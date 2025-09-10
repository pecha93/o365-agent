import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Безопасность вебхуков
  INGEST_HMAC_SECRET: z.string().default('change-me-dev'),

  // Интеграции
  OPENAI_API_KEY: z.string().optional(),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),

  NOTION_TOKEN: z.string().optional(),
  NOTION_INBOX_DB: z.string().optional(),

  // На будущее (Graph Delegated)
  MS_TENANT_ID: z.string().optional(),
  MS_CLIENT_ID: z.string().optional(),
  MS_CLIENT_SECRET: z.string().optional(),

  // Таймзона для кронов
  TZ: z.string().default('Asia/Nicosia'),

  // Режим отправки
  SENDER_MODE: z.enum(['LOG', 'REAL']).default('LOG'),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(raw = process.env): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('❌ Invalid environment:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
