import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Cursor Starter', description: 'Node+React monorepo' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body style={{fontFamily:'sans-serif'}}>{children}</body></html>);
}
