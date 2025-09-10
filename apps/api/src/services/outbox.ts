import { PrismaClient, OutboxStatus, OutboxType } from '@prisma/client';
import { sender } from './sender';

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
        await sender.telegram(text);
      } else if (item.type === OutboxType.NOTION_TASK) {
        const payload = item.payload as unknown as { title?: string; source?: string };
        const title = payload?.title ?? 'Task';
        await sender.notion(title, { source: String(payload?.source ?? 'agent') });
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
