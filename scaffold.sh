#!/usr/bin/env bash
set -euo pipefail

# --- folders
mkdir -p scripts .github/workflows apps/web/src/app apps/web/src/components apps/api/src apps/api/prisma packages/ui/src packages/eslint-config packages/tsconfig

# --- root files
cat > .gitignore <<'EOF'
node_modules
pnpm-lock.yaml
.next
out
dist
coverage
.env*
.DS_Store
EOF

cat > .editorconfig <<'EOF'
root = true
[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
EOF

cat > .prettierrc.cjs <<'EOF'
module.exports = { semi: true, singleQuote: true, trailingComma: 'all', printWidth: 100 };
EOF

cat > commitlint.config.cjs <<'EOF'
module.exports = { extends: ['@commitlint/config-conventional'] };
EOF

cat > pnpm-workspace.yaml <<'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

cat > turbo.json <<'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "test": {}
  }
}
EOF

cat > tsconfig.base.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "baseUrl": ".",
    "paths": { "@ui/*": ["packages/ui/src/*"] }
  }
}
EOF

cat > package.json <<'EOF'
{
  "name": "cursor-node-react-starter",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "format": "prettier -w .",
    "test": "turbo run test",
    "prepare": "husky",
    "db:generate": "pnpm -C apps/api prisma:generate",
    "db:migrate:dev": "pnpm -C apps/api prisma:migrate:dev",
    "db:migrate:deploy": "pnpm -C apps/api prisma:migrate:deploy",
    "db:studio": "pnpm -C apps/api prisma:studio"
  },
  "devDependencies": {
    "@commitlint/cli": "^19.5.0",
    "@commitlint/config-conventional": "^19.5.0",
    "eslint": "^9.9.0",
    "husky": "^9.1.0",
    "lint-staged": "^15.2.10",
    "prettier": "^3.3.3",
    "semantic-release": "^24.0.0",
    "turbo": "^2.1.3",
    "typescript": "^5.6.2"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier -w"],
    "*.{json,md,css}": ["prettier -w"]
  }
}
EOF

cat > docker-compose.dev.yml <<'EOF'
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
EOF

cat > .env.example <<'EOF'
DATABASE_URL="postgresql://app:app@localhost:5432/app?schema=public"
NODE_ENV=development
PORT=4000
EOF

# --- scripts
cat > scripts/bootstrap-macos.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if ! xcode-select -p >/dev/null 2>&1; then xcode-select --install || true; fi
if ! command -v brew >/dev/null 2>&1; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
if [[ $(uname -m) == "arm64" ]]; then eval "$(/opt/homebrew/bin/brew shellenv)"; fi
brew install nvm pnpm git gh jq docker
export NVM_DIR="$HOME/.nvm"; mkdir -p "$NVM_DIR"; source "$(brew --prefix nvm)/nvm.sh"
nvm install --lts && nvm alias default 'lts/*'
git config --global init.defaultBranch main
git config --global pull.rebase false
git config --global core.autocrlf input
echo "✅ macOS bootstrap complete."
EOF
chmod +x scripts/bootstrap-macos.sh

# --- GitHub Actions
cat > .github/workflows/ci.yml <<'EOF'
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
EOF

# --- packages/ui
cat > packages/ui/package.json <<'EOF'
{
  "name": "@workspace/ui",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "build": "tsc -p tsconfig.json" },
  "devDependencies": { "typescript": "^5.6.2" }
}
EOF
cat > packages/ui/tsconfig.json <<'EOF'
{ "extends": "../tsconfig/base.json", "compilerOptions": { "outDir": "dist" }, "include": ["src/**/*"] }
EOF
cat > packages/ui/src/Button.tsx <<'EOF'
import * as React from 'react';
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { label?: string };
export const Button: React.FC<Props> = ({ label = 'Click', ...rest }) => (
  <button className="px-4 py-2 rounded" {...rest}>{label}</button>
);
EOF

# --- packages/eslint-config & tsconfig pkgs
cat > packages/eslint-config/package.json <<'EOF'
{ "name": "@workspace/eslint-config", "version": "1.0.0", "main": "index.cjs", "private": true }
EOF
cat > packages/eslint-config/index.cjs <<'EOF'
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/jsx-runtime',
    'prettier'
  ],
  settings: { react: { version: 'detect' } }
};
EOF
cat > packages/tsconfig/package.json <<'EOF'
{ "name": "@workspace/tsconfig", "version": "1.0.0", "private": true }
EOF
cat > packages/tsconfig/base.json <<'EOF'
{ "extends": "../../tsconfig.base.json" }
EOF

# --- apps/web
cat > apps/web/package.json <<'EOF'
{
  "name": "web",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "eslint ."
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.14.9",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@workspace/eslint-config": "*",
    "typescript": "^5.6.2"
  }
}
EOF

cat > apps/web/next.config.mjs <<'EOF'
const nextConfig = { reactStrictMode: true, experimental: { typedRoutes: true } };
export default nextConfig;
EOF

cat > apps/web/tsconfig.json <<'EOF'
{
  "extends": "../../packages/tsconfig/base.json",
  "compilerOptions": { "jsx": "react-jsx" },
  "include": ["next-env.d.ts", "src/**/*"],
  "exclude": ["node_modules"]
}
EOF

cat > apps/web/src/app/layout.tsx <<'EOF'
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Cursor Starter', description: 'Node+React monorepo' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body style={{fontFamily:'sans-serif'}}>{children}</body></html>);
}
EOF

cat > apps/web/src/app/page.tsx <<'EOF'
import { Button } from '@ui/Button';
export default function Page() {
  return (
    <main style={{ padding: 24 }}>
      <h1>🚀 Cursor Node+React Starter</h1>
      <p>Next.js + Fastify API + Turborepo + PNPM + Prisma/Postgres.</p>
      <Button label="Hello" onClick={() => alert('Hi from shared UI!')} />
    </main>
  );
}
EOF

# --- apps/api
cat > apps/api/package.json <<'EOF'
{
  "name": "api",
  "private": true,
  "type": "module",
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
    "@types/node": "^20.14.9",
    "@workspace/eslint-config": "*",
    "prisma": "^5.18.0",
    "tsx": "^4.16.2",
    "typescript": "^5.6.2"
  }
}
EOF

cat > apps/api/tsconfig.json <<'EOF'
{
  "extends": "../../packages/tsconfig/base.json",
  "compilerOptions": { "outDir": "dist" },
  "include": ["src/**/*", "prisma/**/*"]
}
EOF

cat > apps/api/src/index.ts <<'EOF'
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
EOF

cat > apps/api/prisma/schema.prisma <<'EOF'
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }
model Todo {
  id        String   @id @default(cuid())
  title     String
  done      Boolean  @default(false)
  createdAt DateTime @default(now())
}
EOF

echo "✅ Scaffolding complete."
