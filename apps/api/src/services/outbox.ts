import { PrismaClient, OutboxStatus, OutboxType } from '@prisma/client';
import { sendTelegram } from '../adapters/telegram';
import { createNotionTask } from '../adapters/notion';

export async function dispatchPending(prisma: PrismaClient) {
  const batch = await prisma.outbox.findMany({
    where: { status: OutboxStatus.PENDING },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });
  for (const item of batch) {
    try {
      if (item.type === OutboxType.TELEGRAM_NOTIFY) {
        const payload = item.payload as unknown as { text?: string };
        const text = payload?.text ?? 'Notification';
        await sendTelegram(text);
      } else if (item.type === OutboxType.NOTION_TASK) {
        const payload = item.payload as unknown as { title?: string; source?: string };
        const title = payload?.title ?? 'Task';
        await createNotionTask(title, { source: String(payload?.source ?? 'agent') });
      } else {
        // остальные типы позже
      }
      await prisma.outbox.update({
        where: { id: item.id },
        data: { status: OutboxStatus.SENT, sentAt: new Date(), error: null },
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      await prisma.outbox.update({
        where: { id: item.id },
        data: { status: OutboxStatus.FAILED, error: message },
      });
    }
  }
}
