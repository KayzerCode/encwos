import { useState } from 'react';

/** Placeholder UI for Proxy management */
export default function ProxySection() {
  const [bulk, setBulk] = useState('');
  const [testInProgress, setTestInProgress] = useState(false);

  // NOTE: wire up with API later
  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    // parse `bulk` lines like host:port[:login:pass]
    // send to backend
  };

  const handleTestAll = async () => {
    setTestInProgress(true);
    try {
      // call API to test proxies
    } finally {
      setTestInProgress(false);
    }
  };

  return (
    <div className="panel">
      <header className="panel-header">
        <h1>Proxy</h1>
        <div className="panel-actions">
          <button className="btn" onClick={handleTestAll} disabled={testInProgress}>
            {testInProgress ? 'Testing…' : 'Test all'}
          </button>
        </div>
      </header>

      <form onSubmit={handleUpload} className="grid gap">
        <label className="field">
          <span className="label">Bulk add (one per line)</span>
          <textarea
            value={bulk}
            onChange={e => setBulk(e.target.value)}
            placeholder="host:port&#10;host:port:login:password"
            rows={8}
          />
        </label>
        <div>
          <button className="btn primary" type="submit">Upload list</button>
        </div>
      </form>

      <div className="spacer" />

      <h2>Current proxies</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Host</th>
              <th>Port</th>
              <th>Auth</th>
              <th>Latency</th>
              <th>OK%</th>
              <th>Last check</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {/* Placeholder rows */}
            <tr>
              <td>1.2.3.4</td>
              <td>8080</td>
              <td>—</td>
              <td>120 ms</td>
              <td>98%</td>
              <td>2025‑08‑25 10:12</td>
              <td><button className="btn small">Disable</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
