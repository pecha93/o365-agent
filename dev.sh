#!/usr/bin/env bash
set -euo pipefail

# cd to repo root (dir of this script)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Loading nvm and switching to Node 20"
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm install 20 >/dev/null
  nvm use 20 >/dev/null
else
  echo "WARN: nvm not found. Ensure Node 20 is active."
fi

echo "==> Enabling corepack/pnpm"
corepack enable >/dev/null 2>&1 || true
corepack prepare pnpm@latest --activate >/dev/null 2>&1 || true

echo "==> Starting Postgres via docker-compose.dev.yml"
docker compose -f docker-compose.dev.yml up -d

echo "==> Ensuring env files"
# Web env: NEXT_PUBLIC_API_URL
if [ ! -f .env.development ]; then
  echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.development
  echo "Created .env.development with NEXT_PUBLIC_API_URL=http://localhost:4000"
else
  if ! grep -q '^NEXT_PUBLIC_API_URL=' .env.development; then
    echo "NEXT_PUBLIC_API_URL=http://localhost:4000" >> .env.development
    echo "Appended NEXT_PUBLIC_API_URL to .env.development"
  fi
fi

# API env: PORT, DATABASE_URL
if [ ! -f apps/api/.env ]; then
  cat > apps/api/.env <<'EOF'
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://app:app@localhost:5432/app?schema=public
EOF
  echo "Created apps/api/.env"
else
  # Ensure PORT and DATABASE_URL exist; do not override existing values
  grep -q '^PORT=' apps/api/.env || echo 'PORT=4000' >> apps/api/.env
  grep -q '^DATABASE_URL=' apps/api/.env || echo 'DATABASE_URL=postgresql://app:app@localhost:5432/app?schema=public' >> apps/api/.env
fi

echo "==> Installing workspace dependencies"
pnpm i -w

echo "==> Prisma generate & migrate (dev)"
pnpm db:generate
pnpm db:migrate:dev

echo "==> Starting dev servers (turbo)"
pnpm dev


