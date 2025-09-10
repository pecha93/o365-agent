'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Todo = {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
};

export default function Page() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/todos`, { cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      const data: Todo[] = await res.json();
      setTodos(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'Failed to load');
    }
  }

  async function addTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error(await res.text());
      setTitle('');
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'Failed to add');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Todos</h1>

      <div style={{ marginBottom: 16 }}>
        <a href="/agent" style={{ color: '#0066cc', textDecoration: 'underline' }}>
          → Agent Dashboard
        </a>
      </div>

      <form onSubmit={addTodo} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task title"
          style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 8 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc' }}
        >
          {loading ? 'Adding...' : 'Add'}
        </button>
      </form>

      {error && <div style={{ color: 'crimson', marginBottom: 12 }}>Error: {error}</div>}

      <ul style={{ display: 'grid', gap: 8 }}>
        {todos.map((t) => (
          <li key={t.id} style={{ padding: 12, border: '1px solid #e5e5e5', borderRadius: 8 }}>
            <div style={{ fontWeight: 600 }}>{t.title}</div>
            <div style={{ fontSize: 12, color: '#666' }}>
              {new Date(t.createdAt).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
