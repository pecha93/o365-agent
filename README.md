### Local dev

1) DB
```bash
docker compose -f docker-compose.dev.yml up -d
```

2) Env
```bash
cp .env.example .env.development
cp .env.development apps/api/.env
```

3) deps
```bash
pnpm i -w
```

4) Prisma
```bash
pnpm db:generate
pnpm db:migrate:dev
pnpm -C apps/api prisma:seed   # optional
```

5) Run
```bash
pnpm dev
# API: http://localhost:4000/health
# Web: http://localhost:3000
```

### .env.example (скопируйте в `.env.development`, затем в `apps/api/.env`)
```
# DB
DATABASE_URL="postgresql://app:app@localhost:5432/app?schema=public"

# API
NODE_ENV=development
PORT=4000

# Ingest security
INGEST_HMAC_SECRET=change-me-dev

# LLM
OPENAI_API_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Notion
NOTION_TOKEN=
NOTION_INBOX_DB=

# Microsoft Graph (delegated — на будущее)
MS_TENANT_ID=
MS_CLIENT_ID=
MS_CLIENT_SECRET=

# Cron TZ
TZ=Asia/Nicosia
```


