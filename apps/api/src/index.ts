import Fastify from 'fastify';
import corsPlugin from './plugins/cors';
import prismaPlugin from './plugins/prisma';
import rawPlugin from './plugins/raw';
import { healthRoutes } from './routes/health';
import { todoRoutes } from './routes/todos';
import { ingestRoutes } from './routes/ingest';
import { configTopRoutes } from './routes/config-top';
import { adminRoutes } from './routes/admin';
import { secretsRoutes } from './routes/secrets';
import { authMsRoutes } from './routes/auth-ms';
import { getEnv } from './plugins/env';
import { startCron } from './services/cron';

const env = getEnv();

const app = Fastify({
  logger: {
    level: 'info',
    transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  },
});

async function start() {
  await app.register(rawPlugin);
  await app.register(corsPlugin);
  await app.register(prismaPlugin);

  await app.register(healthRoutes);
  await app.register(todoRoutes);
  await app.register(ingestRoutes);
  await app.register(configTopRoutes);
  await app.register(adminRoutes);
  await app.register(secretsRoutes);
  await app.register(authMsRoutes);

  // Запускаем планировщик
  startCron(app.prisma);

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`API listening on :${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
