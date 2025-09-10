import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { buildDailyDigests } from './digest';
import { dispatchPending } from './outbox';
import { batchMentions } from './mentions-batch';
import { getEnv } from '../plugins/env';

export function startCron(prisma: PrismaClient) {
  const { TZ } = getEnv();

  // Outbox dispatcher — раз в минуту
  cron.schedule(
    '* * * * *',
    async () => {
      await dispatchPending(prisma);
    },
    { timezone: TZ },
  );

  // Daily digests — каждый день в 07:00
  cron.schedule(
    '0 7 * * *',
    async () => {
      await buildDailyDigests(prisma);
    },
    { timezone: TZ },
  );

  // Mentions batching — каждые 30 минут
  cron.schedule(
    '*/30 * * * *',
    async () => {
      await batchMentions(prisma, 30);
    },
    { timezone: TZ },
  );
}
