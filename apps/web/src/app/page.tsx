
'use client';
import { useEffect, useState } from 'react';

type Todo = { id: string; title: string; done: boolean; createdAt: string };

export default function Page() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');

  async function load() {
    const res = await fetch('http://localhost:4000/todos', { cache: 'no-store' });
    setTodos(await res.json());
  }
  async function add() {
    if (!title.trim()) return;
    await fetch('http://localhost:4000/todos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setTitle('');
    load();
  }
  useEffect(() => { load(); }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Todos</h1>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="New todo" />
        <button onClick={add}>Add</button>
      </div>
      <ul>
        {todos.map(t => <li key={t.id}>{t.title}</li>)}
      </ul>
    </main>
  );
}
