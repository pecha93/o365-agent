import { PrismaClient } from '@prisma/client';
import { getEnv } from '../plugins/env';
import { encrypt, decrypt } from '../utils/crypto';

export async function getSecret(
  prisma: PrismaClient,
  userId: string,
  key: string,
): Promise<string | null> {
  const secret = await prisma.secret.findUnique({
    where: { userId_key: { userId, key } },
  });

  if (!secret) return null;

  const env = getEnv();
  return decrypt(secret.valueEnc, env.ENCRYPTION_KEY);
}

export async function setSecret(
  prisma: PrismaClient,
  userId: string,
  key: string,
  value: string,
): Promise<void> {
  const env = getEnv();
  const encryptedValue = encrypt(value, env.ENCRYPTION_KEY);

  await prisma.secret.upsert({
    where: { userId_key: { userId, key } },
    update: { valueEnc: encryptedValue, updatedAt: new Date() },
    create: { userId, key, valueEnc: encryptedValue },
  });
}

export async function deleteSecret(
  prisma: PrismaClient,
  userId: string,
  key: string,
): Promise<void> {
  await prisma.secret.delete({
    where: { userId_key: { userId, key } },
  });
}

export async function listSecrets(
  prisma: PrismaClient,
  userId: string,
): Promise<{ key: string; hasValue: boolean }[]> {
  const secrets = await prisma.secret.findMany({
    where: { userId },
    select: { key: true, valueEnc: true },
  });

  return secrets.map((s) => ({
    key: s.key,
    hasValue: s.valueEnc.length > 0,
  }));
}

// Helper to get or create default user (for now, single user system)
export async function getDefaultUser(prisma: PrismaClient): Promise<string> {
  let user = await prisma.user.findFirst({
    where: { isActive: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'admin@localhost',
        name: 'Admin User',
        isActive: true,
      },
    });
  }

  return user.id;
}
