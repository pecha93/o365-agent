# 1) Восстанавливаем apps/web (package.json + конфиги + минимальный код)
mkdir -p apps/web/src/app

cat > apps/web/package.json <<'JSON'
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
    "@workspace/eslint-config": "workspace:*",
    "typescript": "^5.6.2"
  }
}
JSON

cat > apps/web/next.config.mjs <<'JS'
const nextConfig = { reactStrictMode: true, experimental: { typedRoutes: true } };
export default nextConfig;
JS

cat > apps/web/tsconfig.json <<'JSON'
{
  "extends": "../../packages/tsconfig/base.json",
  "compilerOptions": { "jsx": "react-jsx" },
  "include": ["next-env.d.ts", "src/**/*"],
  "exclude": ["node_modules"]
}
JSON

cat > apps/web/src/app/layout.tsx <<'TSX'
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Cursor Starter', description: 'Node+React monorepo' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body style={{fontFamily:'sans-serif'}}>{children}</body></html>);
}
TSX

cat > apps/web/src/app/page.tsx <<'TSX'
export default function Page() {
  return (
    <main style={{ padding: 24 }}>
      <h1>🚀 Cursor Node+React Starter</h1>
      <p>Next.js + Fastify API + Turborepo + PNPM + Prisma/Postgres.</p>
    </main>
  );
}
TSX

# 2) Устанавливаем зависимости во всём воркспейсе
pnpm i -w

# 3) Генерируем Prisma client и применяем dev-миграции
pnpm db:generate
pnpm db:migrate:dev

# 4) Запускаем дев-серверы (web + api)
pnpm dev

