import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import type { StoredUser } from '../../features/auth/auth.api';

interface NavBarProps {
  user: StoredUser | null;
}

const NavBar: React.FC<NavBarProps> = ({ user }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [openMenu, setOpenMenu] = React.useState<'explore' | 'tools' | null>(null);
  const location = useLocation();
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [location.pathname, location.search]);

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const isExploreActive = location.pathname === '/' || location.pathname.startsWith('/tournaments');
  const isToolsActive = location.pathname.startsWith('/ocr') || location.pathname.startsWith('/admin');

  return (
    <nav className="nav-shell">
      <div className="nav-inner" ref={rootRef}>
        <button
          type="button"
          className="btn btn-secondary mobile-nav-button"
          onClick={() => setMobileOpen((current) => !current)}
          aria-expanded={mobileOpen}
        >
          Menu
        </button>

        <div className={`nav-list ${mobileOpen ? 'open' : ''}`}>
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Home
          </NavLink>

          <div className="nav-dropdown-wrap">
            <button
              type="button"
              className={`dropdown-toggle ${isExploreActive ? 'active' : ''}`}
              onClick={() => setOpenMenu((current) => (current === 'explore' ? null : 'explore'))}
              aria-expanded={openMenu === 'explore'}
            >
              Explore
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {openMenu === 'explore' ? (
              <div className="nav-dropdown">
                <p className="dropdown-label">Tournament discovery</p>
                <div className="dropdown-grid">
                  <Link to="/tournaments" className="dropdown-item">
                    <span className="dropdown-item-title">All tournaments</span>
                    <span className="dropdown-item-text">Browse every event, format, and location.</span>
                  </Link>
                  <Link to="/tournaments?status=live" className="dropdown-item">
                    <span className="dropdown-item-title">Live now</span>
                    <span className="dropdown-item-text">Jump straight into active competitions.</span>
                  </Link>
                  <Link to="/tournaments?status=registration_open" className="dropdown-item">
                    <span className="dropdown-item-title">Open registration</span>
                    <span className="dropdown-item-text">Find tournaments you can join right away.</span>
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          <div className="nav-dropdown-wrap">
            <button
              type="button"
              className={`dropdown-toggle ${isToolsActive ? 'active' : ''}`}
              onClick={() => setOpenMenu((current) => (current === 'tools' ? null : 'tools'))}
              aria-expanded={openMenu === 'tools'}
            >
              Tools
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {openMenu === 'tools' ? (
              <div className="nav-dropdown">
                <p className="dropdown-label">Platform utilities</p>
                <div className="dropdown-grid">
                  <Link to="/ocr" className="dropdown-item">
                    <span className="dropdown-item-title">Image text extractor</span>
                    <span className="dropdown-item-text">Use OCR for screenshots, posters, or documents.</span>
                  </Link>
                  {user?.role === 'admin' ? (
                    <Link to="/admin" className="dropdown-item">
                      <span className="dropdown-item-title">Admin control room</span>
                      <span className="dropdown-item-text">Create tournaments, matches, and announcements.</span>
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Profile
          </NavLink>
        </div>

        <div className="inline-actions">
          <span className="small-pill">Discover</span>
          <span className="small-pill">Compete</span>
          <span className="small-pill">Track</span>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
