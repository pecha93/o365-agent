import crypto from 'crypto';

const IV_LEN = 12; // GCM

export function encrypt(plain: string, key: string): string {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key).slice(0, 32), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(data: string, key: string): string {
  const raw = Buffer.from(data, 'base64');
  const iv = raw.slice(0, IV_LEN);
  const tag = raw.slice(IV_LEN, IV_LEN + 16);
  const enc = raw.slice(IV_LEN + 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key).slice(0, 32), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}
