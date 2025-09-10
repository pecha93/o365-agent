import { PrismaClient } from '@prisma/client';
import { getEnv } from '../plugins/env';
import { sendTelegram } from '../adapters/telegram';
import { createNotionTask } from '../adapters/notion';

export function createSender(prisma: PrismaClient) {
  return {
    async telegram(text: string) {
      const { SENDER_MODE } = getEnv();
      if (SENDER_MODE === 'LOG') {
        console.log('[FAKE TELEGRAM]', text);
        return;
      }
      await sendTelegram(prisma, text);
    },
    async notion(title: string, extra?: { url?: string; source?: string }) {
      const { SENDER_MODE } = getEnv();
      if (SENDER_MODE === 'LOG') {
        console.log('[FAKE NOTION]', title, extra);
        return;
      }
      await createNotionTask(prisma, title, extra);
    },
  };
}
