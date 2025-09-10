import { ConfidentialClientApplication, Configuration } from '@azure/msal-node';
import { PrismaClient } from '@prisma/client';
import { getEnvWithSecrets } from './env-secrets';

let app: ConfidentialClientApplication | null = null;

export async function getMsalApp(prisma: PrismaClient) {
  if (app) return app;
  const env = await getEnvWithSecrets(prisma);

  // Поддержка как старых (MS_CLIENT_ID/MS_CLIENT_SECRET), так и новых (MS_APP_ID/MS_APP_SECRET) переменных
  const clientId = env.MS_CLIENT_ID || env.MS_APP_ID || '';
  const clientSecret = env.MS_CLIENT_SECRET || env.MS_APP_SECRET || '';

  // Проверяем, что у нас есть необходимые креды
  if (!clientId || !clientSecret) {
    console.error('MSAL Configuration Error:', {
      MS_CLIENT_ID: env.MS_CLIENT_ID ? '***' : 'missing',
      MS_APP_ID: env.MS_APP_ID ? '***' : 'missing',
      MS_CLIENT_SECRET: env.MS_CLIENT_SECRET ? '***' : 'missing',
      MS_APP_SECRET: env.MS_APP_SECRET ? '***' : 'missing',
      clientId: clientId ? '***' : 'missing',
      clientSecret: clientSecret ? '***' : 'missing',
    });
    throw new Error(
      'Microsoft OAuth credentials not configured. Please set MS_APP_ID and MS_APP_SECRET in secrets.',
    );
  }

  // Если нет TENANT_ID, используем organizations для multi-tenant (совместимо с single-tenant)
  const authority = env.MS_TENANT_ID
    ? `https://login.microsoftonline.com/${env.MS_TENANT_ID}`
    : 'https://login.microsoftonline.com/organizations';

  console.log('MSAL Configuration:', {
    clientId: clientId.substring(0, 8) + '...',
    authority,
    hasSecret: !!clientSecret,
  });

  const config: Configuration = {
    auth: {
      clientId,
      authority,
      clientSecret,
    },
    system: {
      loggerOptions: { piiLoggingEnabled: false },
      allowNativeBroker: false, // Отключаем native broker
    },
    cache: {
      cachePlugin: undefined, // Отключаем кеширование
    },
  };
  app = new ConfidentialClientApplication(config);
  return app;
}

export async function getScopes(prisma: PrismaClient): Promise<string[]> {
  const env = await getEnvWithSecrets(prisma);
  const scopes = (env.MS_SCOPES || '').split(/\s+/).filter(Boolean);

  // Fallback на дефолтные scopes, если не настроены в базе данных
  if (scopes.length === 0) {
    const defaultScopes = [
      'offline_access',
      'Mail.ReadWrite',
      'Mail.Send',
      'Calendars.ReadWrite',
      'User.Read',
    ];
    console.log('Using default scopes:', defaultScopes);
    return defaultScopes;
  }

  console.log('Using scopes from database:', scopes);
  return scopes;
}
