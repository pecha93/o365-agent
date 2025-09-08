import { PrismaClient } from "@prisma/client";

export async function buildDailyDigests(prisma: PrismaClient, date = new Date()) {
  // Делаем дайджест за предыдущие сутки
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - 1));
  const from = new Date(day);
  const to = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1));

  const threads = await prisma.thread.findMany({ select: { id: true } });
  for (const t of threads) {
    const events = await prisma.event.findMany({
      where: { threadId: t.id, ts: { gte: from, lt: to } },
      orderBy: { ts: "asc" },
    });
    if (!events.length) continue;

    const lines: string[] = [];
    for (const e of events) {
      const mark = e.isFromTop ? "⭐ " : e.salesSignal ? "💡 " : e.analysis ? "• " : "• ";
      const author = e.authorName || e.authorId || "Unknown";
      const text = (e.text ?? "").replace(/\s+/g, " ").trim();
      lines.push(`${mark}${author}: ${text.slice(0, 200)}`);
    }
    const md = [
      `### Daily digest (${from.toISOString().slice(0, 10)})`,
      "",
      ...lines,
    ].join("\n");

    await prisma.dailyDigest.upsert({
      where: { threadId_date: { threadId: t.id, date: from } },
      create: { threadId: t.id, date: from, contentMd: md },
      update: { contentMd: md },
    });

    // Обновим компактный контекст треда (≤2000 символов)
    const compact = md.slice(0, 2000);
    await prisma.thread.update({ where: { id: t.id }, data: { lastSummaryMd: compact, lastSummaryUpdatedAt: new Date() } });
  }
}


