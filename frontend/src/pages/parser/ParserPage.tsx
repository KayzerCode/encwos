import { NavLink, Outlet } from 'react-router-dom';
import './parser.css';

export default function ParserPage() {
  return (
    <div className="parser">
      {/* Left rail */}
      <aside className="parser-rail" aria-label="Parser sections">
        <div className="rail-title">Parser</div>
        <nav className="rail-nav">
          <NavLink to="proxy" className={({ isActive }) => isActive ? 'rail-link active' : 'rail-link'}>
            Proxy
          </NavLink>
          <NavLink to="stats" className={({ isActive }) => isActive ? 'rail-link active' : 'rail-link'}>
            Stats
          </NavLink>
          <NavLink to="tasks" className={({ isActive }) => isActive ? 'rail-link active' : 'rail-link'}>
            Tasks
          </NavLink>
        </nav>
      </aside>

      {/* Content area */}
      <section className="parser-content">
        <Outlet />
      </section>
    </div>
  );
}
