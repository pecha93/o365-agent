'use client';
import { useEffect, useState } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Thread = {
  id: string;
  title?: string | null;
  lastSummaryMd?: string | null;
  updatedAt: string;
};
type Outbox = {
  id: string;
  type: string;
  status: string;
  error?: string | null;
  createdAt: string;
  payload: Record<string, unknown>;
};

export default function AgentDashboard() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [outbox, setOutbox] = useState<Outbox[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [digest, setDigest] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');

  function filteredThreads() {
    return threads.filter((t) => (t.title || t.id).toLowerCase().includes(q.toLowerCase()));
  }

  async function applyOutboxFilter() {
    try {
      const url = `${API}/admin/outbox${status ? `?status=${status}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      setOutbox(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg || 'filter failed');
    }
  }

  async function load() {
    setErr(null);
    try {
      const [t, o] = await Promise.all([
        fetch(`${API}/admin/threads`, { cache: 'no-store' }).then((r) => r.json()),
        fetch(`${API}/admin/outbox`, { cache: 'no-store' }).then((r) => r.json()),
      ]);
      setThreads(t);
      setOutbox(o);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg || 'load failed');
    }
  }
  async function openThread(id: string) {
    setSelected(id);
    setEvents([]);
    setDigest(null);
    const [ev, dg] = await Promise.all([
      fetch(`${API}/admin/threads/${id}/events`).then((r) => r.json()),
      fetch(`${API}/admin/threads/${id}/digest`).then((r) => r.json()),
    ]);
    setEvents(ev);
    setDigest(dg);
  }
  async function confirm(id: string) {
    await fetch(`${API}/admin/outbox/${id}/confirm`, { method: 'POST' });
    await load();
  }
  async function retry(id: string) {
    await fetch(`${API}/admin/outbox/${id}/retry`, { method: 'POST' });
    await load();
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: '32px auto',
        padding: 16,
        display: 'grid',
        gap: 16,
        gridTemplateColumns: '1fr 2fr',
      }}
    >
      {/* Панель фильтров */}
      <section style={{ gridColumn: '1 / span 2', display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          placeholder="Search threads..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
        >
          <option value="">Outbox: ALL</option>
          <option value="PENDING">PENDING</option>
          <option value="SENT">SENT</option>
          <option value="FAILED">FAILED</option>
        </select>
        <button
          onClick={applyOutboxFilter}
          style={{
            padding: 8,
            backgroundColor: '#0078d4',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Apply
        </button>
      </section>

      <section>
        <h2>Threads</h2>
        <ul style={{ display: 'grid', gap: 8 }}>
          {filteredThreads().map((t) => (
            <li
              key={t.id}
              style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, cursor: 'pointer' }}
              onClick={() => openThread(t.id)}
            >
              <div style={{ fontWeight: 600 }}>{t.title || t.id}</div>
              <div style={{ fontSize: 12, color: '#666' }}>
                {new Date(t.updatedAt).toLocaleString()}
              </div>
              {t.lastSummaryMd && (
                <details>
                  <summary>last summary</summary>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{t.lastSummaryMd}</pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Outbox</h2>
        <ul style={{ display: 'grid', gap: 8 }}>
          {outbox.map((o) => (
            <li key={o.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
              <div>
                <b>{o.type}</b> — {o.status} <small>{new Date(o.createdAt).toLocaleString()}</small>
              </div>
              {o.error && <div style={{ color: 'crimson' }}>Error: {o.error}</div>}
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(o.payload, null, 2)}</pre>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => confirm(o.id)}>Confirm</button>
                <button onClick={() => retry(o.id)}>Retry</button>
              </div>
            </li>
          ))}
        </ul>

        {selected && (
          <>
            <h2 style={{ marginTop: 24 }}>Events of thread {selected}</h2>
            <ul style={{ display: 'grid', gap: 8 }}>
              {events.map((e) => (
                <li key={e.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                  <div>
                    <b>{e.authorName || e.authorId || 'Unknown'}</b> —{' '}
                    {new Date(e.ts).toLocaleString()}
                  </div>
                  <div>{e.text}</div>
                  {e.isFromTop && <div>⭐ from TOP</div>}
                  {e.salesSignal && <div>💡 sales signal</div>}
                </li>
              ))}
            </ul>
            <h3>Latest digest</h3>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{digest?.contentMd || '(no digest)'}</pre>
          </>
        )}
      </section>
      {err && <div style={{ color: 'crimson' }}>Error: {err}</div>}
    </main>
  );
}
