import { PrismaClient, Source } from '@prisma/client';
import { graphGet } from '../ms-graph';
import { processEvent } from '../pipeline';

export async function pullTodayCalendar(prisma: PrismaClient) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const data = await graphGet(
    prisma,
    `/me/calendarview?startdatetime=${start.toISOString()}&enddatetime=${end.toISOString()}`,
  );

  for (const ev of data.value || []) {
    const externalId = ev.id as string;
    const threadExtId = `cal-${externalId}`;
    const ts = ev.start?.dateTime || new Date().toISOString();

    const exist = await prisma.event.findFirst({
      where: { source: Source.CALENDAR, externalId },
    });
    if (exist) continue;

    const title = `[CAL] ${ev.subject || 'Meeting'}`;
    const body = `${title} @ ${ev.start?.dateTime} - ${ev.end?.dateTime}`;

    const thread = await prisma.thread.upsert({
      where: { source_externalId: { source: Source.CALENDAR, externalId: threadExtId } },
      update: { title },
      create: { source: Source.CALENDAR, externalId: threadExtId, title },
    });

    const created = await prisma.event.create({
      data: {
        threadId: thread.id,
        source: Source.CALENDAR,
        externalId,
        ts: new Date(ts),
        authorName: 'Calendar',
        text: body,
        isDM: false,
        mentions: [],
        raw: ev,
      },
    });

    await processEvent(prisma, created.id);
  }
}
