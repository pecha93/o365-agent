import { FastifyInstance } from 'fastify';
import { getEnv } from '../plugins/env';
import { getMsalApp, getScopes } from '../services/msal';
import { encrypt } from '../utils/crypto';

export async function authMsRoutes(app: FastifyInstance) {
  app.get('/auth/ms/login', async (req, reply) => {
    const env = getEnv();
    const msal = await getMsalApp(app.prisma);
    const scopes = await getScopes(app.prisma);
    const authCodeUrlParameters = {
      scopes,
      redirectUri: env.MS_REDIRECT_URI,
    };

    console.log('Generating OAuth URL with parameters:', {
      scopes,
      redirectUri: env.MS_REDIRECT_URI,
    });

    try {
      const authCodeUrl = await msal.getAuthCodeUrl(authCodeUrlParameters);
      console.log('Generated OAuth URL:', authCodeUrl);
      reply.redirect(authCodeUrl);
    } catch (error) {
      console.error('Error generating OAuth URL:', error);
      reply.code(500).send({
        error: 'Failed to generate OAuth URL',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get('/auth/ms/callback', async (req, reply) => {
    console.log('OAuth callback received:', {
      query: req.query,
      url: req.url,
      headers: req.headers,
    });

    const env = getEnv();
    const msal = await getMsalApp(app.prisma);
    const scopes = await getScopes(app.prisma);
    const code = (req.query as Record<string, unknown>).code as string;

    if (!code) {
      console.error('Missing code in callback:', req.query);
      return reply.code(400).send({
        error: 'Missing code',
        receivedQuery: req.query,
        expectedFormat: '?code=...&state=...',
      });
    }

    const tokenRequest = {
      code,
      scopes,
      redirectUri: env.MS_REDIRECT_URI,
    };

    let token;
    try {
      token = await msal.acquireTokenByCode(tokenRequest);
    } catch (error) {
      console.error('Token acquisition failed:', error);
      if (error instanceof Error && error.message.includes('already redeemed')) {
        return reply.type('text/html').send(`
            <h3>Authorization code already used</h3>
            <p>The authorization code has already been used. Please try again:</p>
            <a href="/auth/ms/login" style="background: #0078d4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
              Try Again
            </a>
          `);
      }
      return reply.code(400).send({
        error: 'Token acquisition failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }

    if (!token?.accessToken || !token?.account) {
      return reply.code(400).send({ error: 'Token acquisition failed' });
    }

    const key = env.ENCRYPTION_KEY;
    const accessTokenEnc = encrypt(token.accessToken, key);

    // Проверяем refresh token
    console.log('Token received:', {
      hasAccessToken: !!token.accessToken,
      hasRefreshToken: !!token.refreshToken,
      refreshTokenType: typeof token.refreshToken,
      expiresIn: token.expiresIn,
    });

    // @ts-expect-error - refreshToken type not properly defined in MSAL
    const refresh = token.refreshToken ? (token.refreshToken as string) : '';
    if (!refresh) {
      console.warn('No refresh token received from Microsoft');
    }
    const refreshTokenEnc = encrypt(refresh, key);

    const expiresAt = new Date(Date.now() + (token.expiresIn || 60) * 1000);

    // Получаем или создаем пользователя
    const user = await app.prisma.user.upsert({
      where: { email: token.account.username! },
      update: {
        name: token.account.name,
        isActive: true,
      },
      create: {
        email: token.account.username!,
        name: token.account.name,
        isActive: true,
      },
    });

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
        userId: user.id,
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
