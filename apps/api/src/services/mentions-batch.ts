import { PrismaClient, OutboxStatus, OutboxType } from '@prisma/client';

export async function batchMentions(prisma: PrismaClient, windowMinutes = 30) {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  // Берём свежие MENTION, не от топов, не уже «связанные» батчем (помним по relatedEventId=null)
  const events = await prisma.event.findMany({
    where: {
      createdAt: { gte: since },
      isFromTop: false,
      analysis: { path: ['intent'], equals: 'MENTION' } as Record<string, unknown>,
    },
    orderBy: { ts: 'asc' },
  });
  if (!events.length) return;

  const title = `Mentions (${events.length}) — ${new Date().toLocaleTimeString()}`;
  const summary = events
    .map((e) => `• ${e.authorName || e.authorId || 'Unknown'}: ${(e.text || '').slice(0, 120)}`)
    .join('\n');

  await prisma.outbox.create({
    data: {
      type: OutboxType.NOTION_TASK,
      status: OutboxStatus.PENDING,
      payload: { title, summary, source: 'MENTIONS_BATCH' },
    },
  });
}
