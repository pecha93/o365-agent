import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyHmac } from '../utils/hmac';
import { getEnv } from '../plugins/env';
import { parseSourceParam } from '../types';
import { processEvent } from '../services/pipeline';
import { Source } from '@prisma/client';

const unifiedPayload = z.object({
  // Унифицированная форма, которую дадим из коннекторов Power Automate
  threadExternalId: z.string().min(1),
  threadTitle: z.string().optional(),
  eventExternalId: z.string().min(1),
  ts: z.coerce.date(),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
  text: z.string().optional(),
  mentions: z.array(z.string()).default([]),
  isDM: z.boolean().default(false),
  raw: z.any().optional(),
});

export async function ingestRoutes(app: FastifyInstance) {
  app.post<{
    Params: { source: string };
    Body: unknown;
  }>('/ingest/:source', async (req, reply) => {
    const env = getEnv();
    const raw = (req as { rawBody?: string }).rawBody;
    const sig =
      (req.headers['x-signature'] as string | undefined) ??
      (req.headers['x-hub-signature-256'] as string | undefined);
    if (!raw || !verifyHmac(raw, sig, env.INGEST_HMAC_SECRET)) {
      reply.code(401);
      return { error: 'Invalid signature' };
    }

    const src = parseSourceParam(req.params.source);
    if (!src) {
      reply.code(400);
      return { error: 'Bad source' };
    }

    const parsed = unifiedPayload.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'Invalid body', issues: parsed.error.issues };
    }
    const p = parsed.data;

    // Upsert Thread
    const thread = await app.prisma.thread.upsert({
      where: { source_externalId: { source: src as Source, externalId: p.threadExternalId } },
      update: { title: p.threadTitle ?? undefined },
      create: {
        source: src as Source,
        externalId: p.threadExternalId,
        title: p.threadTitle,
        participants: undefined,
      },
    });

    // Idempotent Event by source+externalId
    const existing = await app.prisma.event.findFirst({
      where: { source: src as Source, externalId: p.eventExternalId },
      select: { id: true },
    });
    if (existing) return { ok: true, eventId: existing.id, deduped: true };

    const ev = await app.prisma.event.create({
      data: {
        threadId: thread.id,
        source: src as Source,
        externalId: p.eventExternalId,
        ts: p.ts,
        authorId: p.authorId,
        authorName: p.authorName,
        text: p.text,
        mentions: p.mentions,
        isDM: p.isDM,
        raw: p.raw ?? null,
      },
    });

    // Fire-and-forget обработка (не блокируем ingest)
    processEvent(app.prisma, ev.id).catch((e) => app.log.error(e));

    return { ok: true, eventId: ev.id };
  });
}
