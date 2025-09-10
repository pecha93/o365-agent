import { ConfidentialClientApplication, Configuration } from '@azure/msal-node';
import { getEnv } from '../plugins/env';

let app: ConfidentialClientApplication | null = null;

export function getMsalApp() {
  if (app) return app;
  const env = getEnv();

  // Поддержка как старых (MS_CLIENT_ID/MS_CLIENT_SECRET), так и новых (MS_APP_ID/MS_APP_SECRET) переменных
  const clientId = env.MS_CLIENT_ID || env.MS_APP_ID || '';
  const clientSecret = env.MS_CLIENT_SECRET || env.MS_APP_SECRET || '';

  // Если нет TENANT_ID, используем common для multi-tenant
  const authority = env.MS_TENANT_ID
    ? `https://login.microsoftonline.com/${env.MS_TENANT_ID}`
    : 'https://login.microsoftonline.com/common';

  const config: Configuration = {
    auth: {
      clientId,
      authority,
      clientSecret,
    },
    system: { loggerOptions: { piiLoggingEnabled: false } },
  };
  app = new ConfidentialClientApplication(config);
  return app;
}

export function getScopes(): string[] {
  const env = getEnv();
  return (env.MS_SCOPES || '').split(/\s+/).filter(Boolean);
}
