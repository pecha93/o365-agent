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
  NOTION_NAME_PROP: z.string().default('Name'),
  NOTION_SOURCE_PROP: z.string().default('Source'),
  NOTION_LINK_PROP: z.string().default('Link'),

  // Microsoft OAuth & Graph
  MS_TENANT_ID: z.string().optional(),
  MS_CLIENT_ID: z.string().optional(),
  MS_CLIENT_SECRET: z.string().optional(),
  MS_APP_ID: z.string().optional(), // альтернативное название для CLIENT_ID
  MS_APP_SECRET: z.string().optional(), // альтернативное название для CLIENT_SECRET
  MS_REDIRECT_URI: z.string().default('http://localhost:4000/auth/ms/callback'),
  MS_SCOPES: z
    .string()
    .default('offline_access Mail.ReadWrite Mail.Send Calendars.ReadWrite User.Read'),
  ENCRYPTION_KEY: z.string().default('change-this-32-bytes-key-change-this'),

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
