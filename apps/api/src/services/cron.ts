import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { buildDailyDigests } from './digest';
import { dispatchPending } from './outbox';
import { batchMentions } from './mentions-batch';
import { pullOutlookInbox } from './connectors/outlook';
import { pullTodayCalendar } from './connectors/calendar';
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

  // Outlook: каждые 2 минуты
  cron.schedule(
    '*/2 * * * *',
    async () => {
      try {
        await pullOutlookInbox(prisma);
      } catch (e) {
        console.error(e);
      }
    },
    { timezone: TZ },
  );

  // Calendar: раз в 30 минут
  cron.schedule(
    '*/30 * * * *',
    async () => {
      try {
        await pullTodayCalendar(prisma);
      } catch (e) {
        console.error(e);
      }
    },
    { timezone: TZ },
  );

  // Daily digests — 07:00
  cron.schedule(
    '0 7 * * *',
    async () => {
      await buildDailyDigests(prisma);
    },
    { timezone: TZ },
  );

  // Mentions batch — каждые 30 минут
  cron.schedule(
    '*/30 * * * *',
    async () => {
      await batchMentions(prisma, 30);
    },
    { timezone: TZ },
  );
}
