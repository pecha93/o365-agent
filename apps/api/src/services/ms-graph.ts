import fetch from 'node-fetch';
import { getEnv } from '../plugins/env';
import { decrypt, encrypt } from '../utils/crypto';
import { getMsalApp, getScopes } from './msal';
import { PrismaClient } from '@prisma/client';

export async function getAccessToken(prisma: PrismaClient) {
  const env = getEnv();
  const acc = await prisma.msAccount.findFirst({ orderBy: { updatedAt: 'desc' } });
  if (!acc) throw new Error('No MS account linked');

  // простая проверка протухания (увеличиваем буфер до 5 минут)
  if (acc.expiresAt.getTime() - Date.now() > 300_000) {
    return decrypt(acc.accessTokenEnc, env.ENCRYPTION_KEY);
  }

  // обновление по refreshToken
  const refreshToken = decrypt(acc.refreshTokenEnc, env.ENCRYPTION_KEY);

  console.log('Attempting token refresh:', {
    hasRefreshToken: !!refreshToken,
    refreshTokenLength: refreshToken?.length || 0,
    accountId: acc.homeAccountId,
  });

  if (!refreshToken) {
    throw new Error('No refresh token available. Please re-authenticate.');
  }

  const msal = await getMsalApp(prisma);
  const scopes = await getScopes(prisma);
  const refreshTokenRequest = {
    refreshToken,
    scopes,
  };

  let resp;
  try {
    resp = await msal.acquireTokenByRefreshToken(refreshTokenRequest);
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }

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
