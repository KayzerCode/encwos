/** Placeholder UI for runtime stats */
export default function StatsSection() {
  return (
    <div className="panel">
      <header className="panel-header">
        <h1>Stats</h1>
      </header>

      <div className="cards">
        <div className="card">
          <div className="card-title">Active workers</div>
          <div className="card-value">3</div>
        </div>
        <div className="card">
          <div className="card-title">Queued tasks</div>
          <div className="card-value">17</div>
        </div>
        <div className="card">
          <div className="card-title">Success rate (24h)</div>
          <div className="card-value">92%</div>
        </div>
        <div className="card">
          <div className="card-title">Avg. task time</div>
          <div className="card-value">38s</div>
        </div>
      </div>

      <div className="spacer" />

      <h2>Throughput (last 2h)</h2>
      <div className="chart-placeholder">
        {/* Replace with real chart later */}
        <div className="chart-grid-bg">Chart placeholder</div>
      </div>
    </div>
  );
}
