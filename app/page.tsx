"use client";

import { useState } from 'react';

export default function DashboardPage() {
  const [sql, setSql] = useState("SELECT * FROM users;");
  const [output, setOutput] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const runQuery = async () => {
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });
      const data = await res.json();
      setOutput(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setOutput(err?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Mini RDBMS Demo</p>
          <h1 className="text-3xl font-semibold">Playground</h1>
          <p className="text-slate-300">Run SQL-like statements against the in-memory engine backed by local JSON files.</p>
        </header>

        <div className="space-y-3">
          <label className="text-sm text-slate-300">SQL</label>
          <textarea
            className="w-full h-40 rounded-md bg-slate-900 border border-slate-700 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            value={sql}
            onChange={(e) => setSql(e.target.value)}
          />
          <button
            onClick={runQuery}
            className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Running…' : 'Execute'}
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-slate-300">Result</p>
          <pre className="bg-slate-900 border border-slate-800 rounded-md p-3 text-sm text-slate-100 overflow-auto min-h-40">
            {output || 'No output yet.'}
          </pre>
        </div>
      </div>
    </div>
  );
}
