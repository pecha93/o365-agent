import { ConfidentialClientApplication, Configuration } from '@azure/msal-node';
import { getEnv } from '../plugins/env';

let app: ConfidentialClientApplication | null = null;

export function getMsalApp() {
  if (app) return app;
  const env = getEnv();
  const config: Configuration = {
    auth: {
      clientId: env.MS_CLIENT_ID || '',
      authority: `https://login.microsoftonline.com/${env.MS_TENANT_ID}`,
      clientSecret: env.MS_CLIENT_SECRET || '',
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
