import { PrismaClient } from '@prisma/client';
import { getSecret, getDefaultUser } from '../services/secrets';

export async function sendTelegram(prisma: PrismaClient, text: string) {
  const userId = await getDefaultUser(prisma);
  const botToken = await getSecret(prisma, userId, 'TELEGRAM_BOT_TOKEN');
  const chatId = await getSecret(prisma, userId, 'TELEGRAM_CHAT_ID');

  if (!botToken || !chatId) {
    throw new Error('Telegram is not configured');
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram send failed: ${res.status} ${body}`);
  }
}
