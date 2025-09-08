import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';

const app = Fastify({ logger: true });
const prisma = new PrismaClient();

app.get('/health', async () => ({ ok: true }));
app.get('/todos', async () => prisma.todo.findMany());
app.post('/todos', async (req) => {
  const body = (req as any).body as { title?: string };
  if (!body?.title) return { error: 'title is required' } as const;
  return prisma.todo.create({ data: { title: body.title } });
});

const port = Number(process.env.PORT || 4000);
app.listen({ port, host: '0.0.0.0' })
  .then(() => app.log.info(`API listening on http://localhost:${port}`))
  .catch((err) => { app.log.error(err); process.exit(1); });
