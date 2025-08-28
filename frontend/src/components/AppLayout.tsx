import type { ReactNode } from 'react';
import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './layout.css';

type NavItem = { label: string; to: string; requiresAuth?: boolean };

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Workspace', to: '/app', requiresAuth: true },
  { label: 'Parser', to: '/parser', requiresAuth: true },
  { label: 'Content Seeds', to: '/content', requiresAuth: true },
  { label: 'Login', to: '/login' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout  } = useAuth(); // get auth state
  const isAuthed = !!user;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close menu and manage body scroll
  const closeMenu = () => {
    setMenuOpen(false);
    // return focus to toggle button
    setTimeout(() => {
      toggleRef.current?.focus();
    }, 100);
  };

  // Toggle menu
  const toggleMenu = () => setMenuOpen(prev => !prev);

  // Handle keyboard events
  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
      }

      // Focus trap
      if (e.key === 'Tab' && menuRef.current) {
        const focusableElements = menuRef.current.querySelectorAll(
          'a[href], button:not([disabled])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  // Lock scroll when menu is open
  useEffect(() => {
    document.documentElement.classList.toggle('no-scroll', menuOpen);
    return () => document.documentElement.classList.remove('no-scroll');
  }, [menuOpen]);

  // Focus first menu item when opening
  useEffect(() => {
    if (menuOpen && menuRef.current) {
      const firstLink = menuRef.current.querySelector('a') as HTMLElement;
      setTimeout(() => firstLink?.focus(), 100); // wait for animation
    }
  }, [menuOpen]);

  const onNavClick = () => closeMenu();

  // Compute visible items based on auth
  const visibleNavItems = NAV_ITEMS.filter(item => {
    // hide protected items for guests
    if (item.requiresAuth && !isAuthed) return false;
    // hide Login for authed users
    if (!item.requiresAuth && item.to === '/login' && isAuthed) return false;
    return true;
  });

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">EncWos</div>

        {/* Desktop nav */}
        <nav className="app-nav desktop" aria-busy={loading ? true : undefined}>
          {visibleNavItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {item.label}
            </NavLink>
					))}
					{/* If logged in – show Logout button */}
          {isAuthed && (
						<NavLink
							className={undefined}
							to="/"
							onClick={() => { logout(); closeMenu(); }}
						>
              Logout
            </NavLink>
          )}
        </nav>

        {/* Burger */}
        <button
          ref={toggleRef}
          className="nav-toggle"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          onClick={toggleMenu}
        >
          ☰
        </button>
      </header>

      {/* Backdrop */}
      <div
        className={`nav-backdrop ${menuOpen ? 'open' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* Mobile drawer */}
      <nav
        ref={menuRef}
        className={`app-nav mobile-drawer ${menuOpen ? 'open' : ''}`}
        aria-hidden={!menuOpen}
        aria-label="Mobile navigation"
        role="navigation"
      >
        {visibleNavItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavClick}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
            tabIndex={menuOpen ? 0 : -1}
          >
            {item.label}
          </NavLink>
				))}

				{/* Logout for mobile */}
        {isAuthed && (
          <button onClick={() => { logout(); closeMenu(); }} tabIndex={menuOpen ? 0 : -1}>
            Logout
          </button>
        )}
      </nav>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        © {new Date().getFullYear()} EncWos · Edge stack: Cloudflare Pages + Workers + D1 + R2
      </footer>
    </div>
  );
}
