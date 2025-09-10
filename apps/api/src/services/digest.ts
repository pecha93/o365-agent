import { PrismaClient } from '@prisma/client';

export async function buildDailyDigests(prisma: PrismaClient, date = new Date()) {
  // период: предыдущие сутки локального времени
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() - 1);
  const from = new Date(day);
  const to = new Date(day);
  to.setDate(to.getDate() + 1);

  const threads = await prisma.thread.findMany({ select: { id: true, title: true } });
  for (const t of threads) {
    const events = await prisma.event.findMany({
      where: { threadId: t.id, ts: { gte: from, lt: to } },
      orderBy: { ts: 'asc' },
    });
    if (!events.length) continue;

    const linesTop: string[] = [];
    const linesSales: string[] = [];
    const linesDM: string[] = [];
    const linesMentions: string[] = [];
    const linesOther: string[] = [];

    for (const e of events) {
      const badge = e.isFromTop
        ? '⭐'
        : e.salesSignal
          ? '💡'
          : e.isDM
            ? '📩'
            : (e.analysis as Record<string, unknown>)?.hasMention
              ? '@'
              : '•';
      const author = e.authorName || e.authorId || 'Unknown';
      const text = (e.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 240);
      const line = `${badge} ${author}: ${text}`;
      if (e.isFromTop) linesTop.push(line);
      else if (e.salesSignal) linesSales.push(line);
      else if (e.isDM) linesDM.push(line);
      else if ((e.analysis as Record<string, unknown>)?.hasMention) linesMentions.push(line);
      else linesOther.push(line);
    }

    const parts: string[] = [
      `### Daily digest for "${t.title ?? t.id}" (${from.toISOString().slice(0, 10)})`,
    ];
    if (linesTop.length) {
      parts.push('\n**Top messages**', ...linesTop);
    }
    if (linesSales.length) {
      parts.push('\n**Sales/Incidents**', ...linesSales);
    }
    if (linesDM.length) {
      parts.push('\n**DM / Email**', ...linesDM);
    }
    if (linesMentions.length) {
      parts.push('\n**Mentions**', ...linesMentions);
    }
    if (linesOther.length) {
      parts.push('\n**Other**', ...linesOther);
    }

    let md = parts.join('\n');
    if (md.length > 2000) md = md.slice(0, 1999) + '…';

    await prisma.dailyDigest.upsert({
      where: { threadId_date: { threadId: t.id, date: from } },
      create: { threadId: t.id, date: from, contentMd: md },
      update: { contentMd: md },
    });

    await prisma.thread.update({
      where: { id: t.id },
      data: { lastSummaryMd: md, lastSummaryUpdatedAt: new Date() },
    });
  }
}
