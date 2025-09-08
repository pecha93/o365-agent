# Cursor Node+React Starter (PNPM + Turborepo + Prisma + Postgres)

> Monorepo for Mac (M‑series ready) with Next.js (React) + Fastify API + Prisma (Postgres), TypeScript, ESLint/Prettier, Husky, lint‑staged, Commitlint, GitHub Actions (CI + Release + DB migrations), and ready-to-extend packages.

```
.
├── README.md
├── .editorconfig
├── .gitignore
├── .nvmrc
├── .prettierignore
├── .prettierrc.cjs
├── commitlint.config.cjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── scripts
│   └── bootstrap-macos.sh
├── .github
│   └── workflows
│       ├── ci.yml
│       ├── release.yml
│       └── deploy.yml
├── docker-compose.dev.yml
├── .env.example
├── apps
│   ├── web                   # Next.js 14 app router
│   ├── api                   # Fastify (Node.js) REST API + Prisma ORM
│   │   ├── prisma
│   │   │   └── schema.prisma
│   │   └── src
│   │       ├── index.ts
│   │       └── routes
│   │           └── todos.ts
└── packages
    ├── eslint-config
    ├── tsconfig
    └── ui
```

---

## docker-compose.dev.yml

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
volumes:
  pg_data:
```

---

## .env.example

```
# Development
DATABASE_URL="postgresql://app:app@localhost:5432/app?schema=public"
NODE_ENV=development

# Production (override in GitHub Secrets / VM env)
# DATABASE_URL="postgresql://<user>:<pass>@<host>:5432/<db>?sslmode=require"
```

---

## apps/api/prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Todo {
  id        String   @id @default(cuid())
  title     String
  done      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

---

## apps/api/src/index.ts

```ts
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import todosRoutes from './routes/todos';

const prisma = new PrismaClient();
const app = Fastify();

app.register(todosRoutes, { prefix: '/todos' });

app.get('/health', async () => ({
  ok: true,
  db: await prisma.$queryRaw`SELECT 1` ? 'up' : 'down'
}));

const port = Number(process.env.PORT || 4000);
app.listen({ port }).then(() => {
  console.log(`API listening on http://localhost:${port}`);
});
```

---

## apps/api/src/routes/todos.ts

```ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function todosRoutes(app: FastifyInstance) {
  app.get('/', async () => prisma.todo.findMany());

  app.post('/', async (req: any) => {
    const { title } = req.body;
    return prisma.todo.create({ data: { title } });
  });

  app.put('/:id', async (req: any) => {
    const { id } = req.params;
    const { done } = req.body;
    return prisma.todo.update({ where: { id }, data: { done } });
  });
}
```

---

## package.json (root additions)

```json
{
  "scripts": {
    "db:migrate": "prisma migrate dev --schema=apps/api/prisma/schema.prisma",
    "db:generate": "prisma generate --schema=apps/api/prisma/schema.prisma",
    "db:deploy": "prisma migrate deploy --schema=apps/api/prisma/schema.prisma"
  },
  "devDependencies": {
    "prisma": "^5.17.0",
    "@prisma/client": "^5.17.0"
  }
}
```

---

## .github/workflows/deploy.yml

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'pnpm'
      - run: pnpm i --frozen-lockfile
      - run: pnpm build
      - run: pnpm db:deploy
      - name: Deploy to VM
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /srv/app
            git pull origin main
            pnpm i --frozen-lockfile
            pnpm build
            pm2 restart api
```

---

## README.md (updates)

```md
### Database (Postgres + Prisma)

- Local dev: `docker compose -f docker-compose.dev.yml up -d`
- Env vars: copy `.env.example` → `.env`
- Migrate: `pnpm db:migrate`
- Generate client: `pnpm db:generate`
- Prod deploy: `pnpm db:deploy`

**Health check:** `GET /health` → returns `{ ok: true, db: 'up' }`
```

---

Теперь проект включает Postgres (через docker-compose.dev.yml), Prisma ORM, миграции и маршруты для простого Todo API. GitHub Actions автоматически прогоняет миграции при деплое.


---

# ✚ Additions: Database (Postgres + Prisma) + Dev Compose

## docker-compose.dev.yml

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
volumes:
  pg_data:
```

## .env.example

```dotenv
# Development database
DATABASE_URL="postgresql://app:app@localhost:5432/app?schema=public"
NODE_ENV=development
# API
PORT=4000
```

## apps/api/prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Todo {
  id        String   @id @default(cuid())
  title     String
  done      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

## apps/api/src/index.ts (update)

```ts
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
app
  .listen({ port, host: '0.0.0.0' })
  .then(() => app.log.info(`API listening on http://localhost:${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
```

## apps/api/package.json (update scripts & deps)

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "lint": "eslint .",
    "prisma:generate": "prisma generate --schema prisma/schema.prisma",
    "prisma:migrate:dev": "prisma migrate dev --schema prisma/schema.prisma",
    "prisma:migrate:deploy": "prisma migrate deploy --schema prisma/schema.prisma",
    "prisma:studio": "prisma studio --schema prisma/schema.prisma"
  },
  "dependencies": {
    "@prisma/client": "^5.18.0",
    "fastify": "^4.28.1"
  },
  "devDependencies": {
    "prisma": "^5.18.0"
  }
}
```

## Root package.json: add DB scripts (run prisma from root)

```json
{
  "scripts": {
    "db:generate": "pnpm -C apps/api prisma:generate",
    "db:migrate:dev": "pnpm -C apps/api prisma:migrate:dev",
    "db:migrate:deploy": "pnpm -C apps/api prisma:migrate:deploy",
    "db:studio": "pnpm -C apps/api prisma:studio"
  }
}
```

## CI: .github/workflows/ci.yml (ensure prisma client is generated)

```yaml
- run: pnpm db:generate
```
(добавьте шаг перед `pnpm lint/build` — уже вставлено в пример ниже, если вы синхронизируете):

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'pnpm'
      - run: pnpm i --frozen-lockfile
      - run: pnpm db:generate
      - run: pnpm lint
      - run: pnpm build
      - run: pnpm test
```

## README (расширение)

```md
### Database (Postgres + Prisma)
Dev: запустите `docker compose -f docker-compose.dev.yml up -d`.
ENV: скопируйте `.env.example` → `.env.development` и проверьте `DATABASE_URL`.
Миграции: `pnpm db:migrate:dev` для разработки, `pnpm db:migrate:deploy` на staging/prod.
Проверка: `curl http://localhost:4000/health` и `GET /todos`.
```
