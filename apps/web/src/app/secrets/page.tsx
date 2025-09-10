'use client';
import { useEffect, useState } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Secret = {
  key: string;
  hasValue: boolean;
};

type SecretValue = {
  key: string;
  value: string;
};

export default function SecretsPage() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState({ key: '', value: '' });
  const [editingSecret, setEditingSecret] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, Record<string, unknown>>>({});

  async function loadSecrets() {
    setError(null);
    try {
      const res = await fetch(`${API}/secrets`, { cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      const data: Secret[] = await res.json();
      setSecrets(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'Failed to load secrets');
    }
  }

  async function saveSecret() {
    if (!newSecret.key.trim() || !newSecret.value.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSecret),
      });
      if (!res.ok) throw new Error(await res.text());

      setNewSecret({ key: '', value: '' });
      await loadSecrets();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'Failed to save secret');
    } finally {
      setLoading(false);
    }
  }

  async function deleteSecret(key: string) {
    if (!confirm(`Delete secret "${key}"?`)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/secrets/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());

      await loadSecrets();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'Failed to delete secret');
    } finally {
      setLoading(false);
    }
  }

  async function testSecret(key: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/secrets/${encodeURIComponent(key)}/test`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok) {
        setTestResults((prev) => ({ ...prev, [key]: data }));
      } else {
        setTestResults((prev) => ({ ...prev, [key]: { error: data.error } }));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setTestResults((prev) => ({ ...prev, [key]: { error: msg } }));
    } finally {
      setLoading(false);
    }
  }

  async function viewSecret(key: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/secrets/${encodeURIComponent(key)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      const data: SecretValue = await res.json();

      setEditingSecret(key);
      setNewSecret({ key: data.key, value: data.value });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'Failed to load secret');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSecrets();
  }, []);

  const commonSecrets = [
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
    'NOTION_TOKEN',
    'NOTION_INBOX_DB',
    'OPENAI_API_KEY',
    'MS_TENANT_ID',
    'MS_CLIENT_ID',
    'MS_CLIENT_SECRET',
    'MS_APP_ID',
    'MS_APP_SECRET',
    'MS_SCOPES',
  ];

  return (
    <main style={{ maxWidth: 800, margin: '32px auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Secrets Management</h1>

      <div style={{ marginBottom: 24 }}>
        <a href="/" style={{ color: '#0066cc', textDecoration: 'underline', marginRight: 16 }}>
          ← Back to Todos
        </a>
        <a href="/agent" style={{ color: '#0066cc', textDecoration: 'underline' }}>
          → Agent Dashboard
        </a>
      </div>

      {error && (
        <div
          style={{
            color: 'crimson',
            marginBottom: 16,
            padding: 12,
            backgroundColor: '#ffe6e6',
            borderRadius: 8,
          }}
        >
          Error: {error}
        </div>
      )}

      {/* Add/Edit Secret Form */}
      <section style={{ marginBottom: 32, padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>
          {editingSecret ? `Edit Secret: ${editingSecret}` : 'Add New Secret'}
        </h2>

        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Key:</label>
            <select
              value={newSecret.key}
              onChange={(e) => setNewSecret((prev) => ({ ...prev, key: e.target.value }))}
              style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
            >
              <option value="">Select or type custom key...</option>
              {commonSecrets.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newSecret.key}
              onChange={(e) => setNewSecret((prev) => ({ ...prev, key: e.target.value }))}
              placeholder="Or type custom key..."
              style={{
                width: '100%',
                padding: 8,
                border: '1px solid #ccc',
                borderRadius: 4,
                marginTop: 4,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Value:</label>
            <textarea
              value={newSecret.value}
              onChange={(e) => setNewSecret((prev) => ({ ...prev, value: e.target.value }))}
              placeholder="Enter secret value..."
              rows={3}
              style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={saveSecret}
            disabled={loading || !newSecret.key.trim() || !newSecret.value.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Saving...' : editingSecret ? 'Update' : 'Save'}
          </button>

          {editingSecret && (
            <button
              onClick={() => {
                setEditingSecret(null);
                setNewSecret({ key: '', value: '' });
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      {/* Secrets List */}
      <section>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Stored Secrets</h2>

        {secrets.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No secrets stored yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {secrets.map((secret) => (
              <div
                key={secret.key}
                style={{
                  padding: 16,
                  border: '1px solid #eee',
                  borderRadius: 8,
                  backgroundColor: secret.hasValue ? '#f8f9fa' : '#fff3cd',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <strong>{secret.key}</strong>
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 12,
                        color: secret.hasValue ? '#28a745' : '#ffc107',
                      }}
                    >
                      {secret.hasValue ? '✓ Set' : '⚠ Empty'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {secret.hasValue && (
                      <>
                        <button
                          onClick={() => viewSecret(secret.key)}
                          style={{
                            padding: '4px 8px',
                            fontSize: 12,
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                          }}
                        >
                          View
                        </button>

                        <button
                          onClick={() => testSecret(secret.key)}
                          disabled={loading}
                          style={{
                            padding: '4px 8px',
                            fontSize: 12,
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                          }}
                        >
                          Test
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => deleteSecret(secret.key)}
                      style={{
                        padding: '4px 8px',
                        fontSize: 12,
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {testResults[secret.key] && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 8,
                      backgroundColor: '#e9ecef',
                      borderRadius: 4,
                    }}
                  >
                    <strong>Test Result:</strong>
                    {testResults[secret.key].error ? (
                      <div style={{ color: '#dc3545' }}>❌ {testResults[secret.key].error}</div>
                    ) : (
                      <div style={{ color: '#28a745' }}>
                        ✅ Connected to {testResults[secret.key].service}
                        <pre style={{ fontSize: 11, marginTop: 4, whiteSpace: 'pre-wrap' }}>
                          {JSON.stringify(testResults[secret.key].data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
