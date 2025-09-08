import { PrismaClient, OutboxStatus, OutboxType, Source } from "@prisma/client";
import { classifyEvent } from "./classify";

export async function processEvent(prisma: PrismaClient, eventId: string) {
  const ev = await prisma.event.findUnique({ where: { id: eventId }, include: { thread: true } });
  if (!ev) return;

  const cls = await classifyEvent(prisma, {
    source: ev.source,
    authorId: ev.authorId,
    authorName: ev.authorName,
    text: ev.text ?? "",
    mentions: ev.mentions,
    isDM: ev.isDM,
  });

  await prisma.event.update({
    where: { id: ev.id },
    data: {
      analysis: { intent: cls.intent, hasMention: cls.hasMention },
      salesSignal: cls.salesSignal,
      isFromTop: cls.isFromTop,
    },
  });

  // Решение об экшенах
  const actions: { type: OutboxType; payload: any }[] = [];

  if (cls.intent === "TOP_PING") {
    actions.push({
      type: OutboxType.TELEGRAM_NOTIFY,
      payload: {
        title: "Message from TOP",
        text: truncate(`${ev.authorName ?? ev.authorId ?? "Unknown"}: ${ev.text ?? ""}`, 1000),
      },
    });
  }

  if (cls.intent === "MENTION" || cls.intent === "DM") {
    actions.push({
      type: OutboxType.NOTION_TASK,
      payload: {
        title: buildTaskTitle(ev),
        source: ev.source,
        threadId: ev.threadId,
        eventId: ev.id,
      },
    });
  }

  if (actions.length) {
    await prisma.$transaction(
      actions.map(a =>
        prisma.outbox.create({
          data: {
            type: a.type,
            status: OutboxStatus.PENDING,
            payload: a.payload,
            threadId: ev.threadId,
            relatedEventId: ev.id,
          },
        })
      )
    );
  }

  // Обновим LastSeen
  await prisma.lastSeen.upsert({
    where: { threadId: ev.threadId },
    create: {
      threadId: ev.threadId,
      lastExternalId: ev.externalId,
      lastTs: ev.ts,
    },
    update: {
      lastExternalId: ev.externalId,
      lastTs: ev.ts,
    },
  });
}

function buildTaskTitle(ev: { text?: string | null }) {
  const t = (ev.text ?? "").trim();
  return t ? `Reply: ${truncate(t, 120)}` : "Reply";
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}


