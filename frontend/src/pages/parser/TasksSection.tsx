import { useState } from 'react';

/** Placeholder UI for task creation & list */
export default function TasksSection() {
  const [query, setQuery] = useState('');
  const [market, setMarket] = useState('US');

  const createTask = (e: React.FormEvent) => {
    e.preventDefault();
    // call API to enqueue parse job with { query, market }
  };

  return (
    <div className="panel">
      <header className="panel-header">
        <h1>Tasks</h1>
      </header>

      <form onSubmit={createTask} className="grid gap grid-2">
        <label className="field">
          <span className="label">Query / ASIN / URL</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="wireless earbuds OR B08N5"
          />
        </label>
        <label className="field">
          <span className="label">Marketplace</span>
          <select value={market} onChange={e => setMarket(e.target.value)}>
            <option value="US">US</option>
            <option value="DE">DE</option>
            <option value="UK">UK</option>
            <option value="JP">JP</option>
          </select>
        </label>
        <div className="col-span-2">
          <button type="submit" className="btn primary">Create task</button>
        </div>
      </form>

      <div className="spacer" />

      <h2>Recent tasks</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Query</th>
              <th>Market</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {/* Placeholder rows */}
            <tr>
              <td>#1042</td>
              <td>“wireless earbuds”</td>
              <td>US</td>
              <td>Running</td>
              <td>57%</td>
              <td>2025‑08‑25 10:01</td>
              <td><button className="btn small">Details</button></td>
            </tr>
            <tr>
              <td>#1041</td>
              <td>B0CXYZ123</td>
              <td>DE</td>
              <td>Done</td>
              <td>100%</td>
              <td>2025‑08‑25 09:35</td>
              <td><button className="btn small">Results</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
