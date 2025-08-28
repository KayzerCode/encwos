// pages/content/ContentPage.tsx
import { NavLink, Outlet } from 'react-router-dom';
import './content.css';

export default function ContentPage() {
  return (
    <div className="content">
      {/* Left rail navigation */}
      <aside className="content-rail" aria-label="Content sections">
        <div className="rail-title">Content Seeds</div>
        <nav className="rail-nav">
          <NavLink
            to="seeds"
            className={({ isActive }) => isActive ? 'rail-link active' : 'rail-link'}
          >
            Seeds
          </NavLink>
          <NavLink
            to="groups"
            className={({ isActive }) => isActive ? 'rail-link active' : 'rail-link'}
          >
            Groups
          </NavLink>
        </nav>
      </aside>

      {/* Content area */}
      <section className="content-main">
        <Outlet />
      </section>
    </div>
  );
}