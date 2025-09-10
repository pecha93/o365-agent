import { PrismaClient, Source } from '@prisma/client';
import { graphGet } from '../ms-graph';
import { processEvent } from '../pipeline';

export async function pullOutlookInbox(prisma: PrismaClient) {
  // последние 20 писем за сегодня (можно адаптировать фильтры)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const filter = encodeURIComponent(`receivedDateTime ge ${today.toISOString()}`);
  const data = await graphGet(
    prisma,
    `/me/messages?$top=20&$orderby=receivedDateTime desc&$filter=${filter}`,
  );

  for (const m of data.value || []) {
    const externalId = m.id as string;
    const threadExtId = (m.conversationId as string) || `mail-${m.id}`;
    const ts = m.receivedDateTime as string;
    const authorName = m.from?.emailAddress?.name as string | undefined;
    const authorId = m.from?.emailAddress?.address as string | undefined;
    const text = [m.subject, stripHtml(m.bodyPreview || '')].filter(Boolean).join(' — ');

    // idempotent — проверим наличие
    const exist = await prisma.event.findFirst({
      where: { source: Source.OUTLOOK, externalId },
    });
    if (exist) continue;

    // Thread upsert
    const thread = await prisma.thread.upsert({
      where: { source_externalId: { source: Source.OUTLOOK, externalId: threadExtId } },
      update: { title: m.subject || undefined },
      create: { source: Source.OUTLOOK, externalId: threadExtId, title: m.subject || null },
    });

    const ev = await prisma.event.create({
      data: {
        threadId: thread.id,
        source: Source.OUTLOOK,
        externalId,
        ts: new Date(ts),
        authorId,
        authorName,
        text,
        mentions: [],
        isDM: true, // почта трактуем как «личное обращение»
        raw: m,
      },
    });

    await processEvent(prisma, ev.id);
  }
}

function stripHtml(s: string) {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
