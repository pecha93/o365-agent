import { FastifyInstance } from 'fastify';
import { getEnv } from '../plugins/env';
import { getMsalApp, getScopes } from '../services/msal';
import { encrypt } from '../utils/crypto';

export async function authMsRoutes(app: FastifyInstance) {
  app.get('/auth/ms/login', async (req, reply) => {
    const env = getEnv();
    const msal = getMsalApp();
    const authCodeUrlParameters = {
      scopes: getScopes(),
      redirectUri: env.MS_REDIRECT_URI,
    };
    const authCodeUrl = await msal.getAuthCodeUrl(authCodeUrlParameters);
    reply.redirect(authCodeUrl);
  });

  app.get('/auth/ms/callback', async (req, reply) => {
    const env = getEnv();
    const msal = getMsalApp();
    const code = (req.query as Record<string, unknown>).code as string;
    if (!code) return reply.code(400).send({ error: 'Missing code' });

    const tokenRequest = {
      code,
      scopes: getScopes(),
      redirectUri: env.MS_REDIRECT_URI,
    };
    const token = await msal.acquireTokenByCode(tokenRequest);

    if (!token?.accessToken || !token?.account) {
      return reply.code(400).send({ error: 'Token acquisition failed' });
    }

    const key = env.ENCRYPTION_KEY;
    const accessTokenEnc = encrypt(token.accessToken, key);
    // @ts-expect-error - refreshToken type not properly defined in MSAL
    const refresh = token.refreshToken ? (token.refreshToken as string) : '';
    const refreshTokenEnc = encrypt(refresh, key);

    const expiresAt = new Date(Date.now() + (token.expiresIn || 60) * 1000);

    const rec = await app.prisma.msAccount.upsert({
      where: { homeAccountId: token.account.homeAccountId! },
      update: {
        username: token.account.username,
        displayName: token.account.name,
        accessTokenEnc,
        refreshTokenEnc,
        expiresAt,
      },
      create: {
        homeAccountId: token.account.homeAccountId!,
        username: token.account.username,
        displayName: token.account.name,
        accessTokenEnc,
        refreshTokenEnc,
        expiresAt,
      },
    });

    return reply
      .type('text/html')
      .send(`<h3>Microsoft account linked</h3><p>${rec.displayName || rec.username}</p>`);
  });
}
