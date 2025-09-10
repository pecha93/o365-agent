import fetch from 'node-fetch';
import { getEnv } from '../plugins/env';
import { decrypt, encrypt } from '../utils/crypto';
import { getMsalApp, getScopes } from './msal';
import { PrismaClient } from '@prisma/client';

export async function getAccessToken(prisma: PrismaClient) {
  const env = getEnv();
  const acc = await prisma.msAccount.findFirst({ orderBy: { updatedAt: 'desc' } });
  if (!acc) throw new Error('No MS account linked');

  // простая проверка протухания
  if (acc.expiresAt.getTime() - Date.now() > 60_000) {
    return decrypt(acc.accessTokenEnc, env.ENCRYPTION_KEY);
  }

  // обновление по refreshToken
  const refreshToken = decrypt(acc.refreshTokenEnc, env.ENCRYPTION_KEY);
  const msal = await getMsalApp(prisma);
  const scopes = await getScopes(prisma);
  const refreshTokenRequest = {
    refreshToken,
    scopes,
  };
  const resp = await msal.acquireTokenByRefreshToken(refreshTokenRequest);

  if (!resp?.accessToken) throw new Error('Failed to refresh token');

  const accessTokenEnc = encrypt(resp.accessToken, env.ENCRYPTION_KEY);
  const newExpires = new Date(Date.now() + (resp.expiresIn || 60) * 1000);
  await prisma.msAccount.update({
    where: { homeAccountId: acc.homeAccountId },
    data: { accessTokenEnc, expiresAt: newExpires },
  });
  return resp.accessToken;
}

export async function graphGet(prisma: PrismaClient, path: string) {
  const token = await getAccessToken(prisma);
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Graph ${res.status}: ${await res.text()}`);
  return res.json();
}
