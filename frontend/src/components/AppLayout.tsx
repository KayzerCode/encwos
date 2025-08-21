import type { ReactNode } from 'react';
import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import './layout.css';

type NavItem = { label: string; to: string; requiresAuth?: boolean };
const NAV_ITEMS: NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Workspace', to: '/app', requiresAuth: true },
  { label: 'Login', to: '/login' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const isAuthed = true;

  // Close menu and manage body scroll
  const closeMenu = () => {
    setMenuOpen(false);
    // Return focus to toggle button
    setTimeout(() => {
      toggleRef.current?.focus();
    }, 100);
  };

  // Toggle menu
  const toggleMenu = () => {
    setMenuOpen(prev => !prev);
  };

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
      setTimeout(() => {
        firstLink?.focus();
      }, 100); // Wait for animation
    }
  }, [menuOpen]);

  const onNavClick = () => {
    closeMenu();
  };

  const filteredNavItems = NAV_ITEMS.filter(item =>
    item.requiresAuth ? isAuthed : true
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">EncWos</div>

        {/* Desktop nav */}
        <nav className="app-nav desktop">
          {filteredNavItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Burger */}
        <button
          ref={toggleRef}
          className="nav-toggle"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Закрыть навигацию' : 'Открыть навигацию'}
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
        aria-label="Мобильная навигация"
        role="navigation"
      >
        {filteredNavItems.map(item => (
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
      </nav>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        © {new Date().getFullYear()} EncWos · Edge stack: Cloudflare Pages + Workers + D1 + R2
      </footer>
    </div>
  );
}