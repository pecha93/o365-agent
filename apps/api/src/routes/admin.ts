import { FastifyInstance } from 'fastify';

export async function adminRoutes(app: FastifyInstance) {
  // Outbox list
  app.get('/admin/outbox', async (req) => {
    const status = (req.query as { status?: string })?.status;
    return app.prisma.outbox.findMany({
      where: status
        ? { status: status as 'PENDING' | 'CONFIRMED' | 'SENT' | 'FAILED' | 'CANCELED' }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  });

  // Confirm (меняем статус на CONFIRMED; dispatcher отправит)
  app.post<{ Params: { id: string } }>('/admin/outbox/:id/confirm', async (req) => {
    return app.prisma.outbox.update({
      where: { id: req.params.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });
  });

  // Retry (снова в PENDING)
  app.post<{ Params: { id: string } }>('/admin/outbox/:id/retry', async (req) => {
    return app.prisma.outbox.update({
      where: { id: req.params.id },
      data: { status: 'PENDING', error: null },
    });
  });

  // Threads list
  app.get('/admin/threads', async () => {
    return app.prisma.thread.findMany({ orderBy: { updatedAt: 'desc' }, take: 100 });
  });

  // Thread events
  app.get<{ Params: { id: string } }>('/admin/threads/:id/events', async (req) => {
    return app.prisma.event.findMany({
      where: { threadId: req.params.id },
      orderBy: { ts: 'desc' },
      take: 200,
    });
  });

  // Latest digest
  app.get<{ Params: { id: string } }>('/admin/threads/:id/digest', async (req) => {
    const last = await app.prisma.dailyDigest.findFirst({
      where: { threadId: req.params.id },
      orderBy: { date: 'desc' },
    });
    return last ?? { contentMd: '(no digest yet)' };
  });
}
