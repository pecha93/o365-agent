import { getEnv } from '../plugins/env';
import { sendTelegram } from '../adapters/telegram';
import { createNotionTask } from '../adapters/notion';

export const sender = {
  async telegram(text: string) {
    const { SENDER_MODE } = getEnv();
    if (SENDER_MODE === 'LOG') {
      console.log('[FAKE TELEGRAM]', text);
      return;
    }
    await sendTelegram(text);
  },
  async notion(title: string, extra?: { url?: string; source?: string }) {
    const { SENDER_MODE } = getEnv();
    if (SENDER_MODE === 'LOG') {
      console.log('[FAKE NOTION]', title, extra);
      return;
    }
    await createNotionTask(title, extra);
  },
};
