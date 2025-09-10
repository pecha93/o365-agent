import { getEnv } from '../plugins/env';
import { createNotionTask } from '../adapters/notion';

export const sender = {
  async telegram(text: string) {
    const { SENDER_MODE } = getEnv();
    if (SENDER_MODE === 'LOG') {
      console.log('[FAKE TELEGRAM]', text);
      return;
    }
    // реальную отправку ты уже подключишь через adapters/telegram
    throw new Error('REAL Telegram send not wired here yet');
  },
  async notion(title: string, extra?: { url?: string; source?: string }) {
    const { SENDER_MODE } = getEnv();
    if (SENDER_MODE === 'LOG') {
      console.log('[FAKE NOTION]', title, extra);
      return;
    }
    const created = await createNotionTask({ title, ...extra });
    console.log('[NOTION CREATED]', created.url);
    return created;
  },
};
