import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { getEnv } from '../plugins/env';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, key);
  cipher.setAAD(Buffer.from('agent-secrets', 'utf8'));

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string, key: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }

  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key);
  decipher.setAAD(Buffer.from('agent-secrets', 'utf8'));
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

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
