import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProfileIcon } from '../../config/profileIcons';
import type { StoredUser } from '../../features/auth/auth.api';

interface HeaderProps {
  user: StoredUser | null;
  loggedIn: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  busy?: boolean;
}

const Header: React.FC<HeaderProps> = ({ user, loggedIn, onLoginClick, onLogoutClick, busy }) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!profileMenuOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [profileMenuOpen]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tournaments?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogoutClick = () => {
    onLogoutClick();
    setProfileMenuOpen(false);
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <button type="button" className="brand-link btn btn-linklike" onClick={() => navigate('/')}>
          <span className="brand-mark">T</span>
          <span className="brand-text">
            <span className="brand-wordmark">Tournaments</span>
            <span className="brand-subtitle">Play. Organize. Climb.</span>
          </span>
        </button>

        <form className="header-search" onSubmit={handleSearch}>
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Search tournaments, games, or locations"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search tournaments"
          />
          <button type="submit" className="search-button" aria-label="Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
        </form>

        <div className="header-actions">
          <div className="header-utility">
            <span className="status-dot" aria-hidden="true"></span>
            <span>Esports-ready tournament dashboard</span>
          </div>

          {loggedIn && user ? (
            <div className="account-menu" ref={wrapperRef}>
              <button
                type="button"
                className="account-trigger"
                onClick={() => setProfileMenuOpen((current) => !current)}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
              >
                <div className="account-avatar">
                  <div dangerouslySetInnerHTML={{ __html: getProfileIcon(user.profile_icon) }} />
                </div>
                <div className="account-text">
                  <span className="account-label">Signed in as</span>
                  <span className="account-name">{user.name || user.email}</span>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {profileMenuOpen ? (
                <div className="account-panel" role="menu">
                  <div className="account-links">
                    <div>
                      <p className="account-name">{user.name || user.email}</p>
                      <p className="account-email">{user.email}</p>
                    </div>
                    <span className="role-pill">{user.role}</span>
                  </div>

                  <div className="panel-divider"></div>

                  <div className="account-links">
                    <button
                      type="button"
                      className="account-link"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate('/profile');
                      }}
                    >
                      <span>Open profile</span>
                      <span>Profile</span>
                    </button>

                    {user.role === 'admin' ? (
                      <button
                        type="button"
                        className="account-link"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate('/admin');
                        }}
                      >
                        <span>Manage tournaments</span>
                        <span>Admin</span>
                      </button>
                    ) : null}

                    <Link to="/tournaments" className="account-link" onClick={() => setProfileMenuOpen(false)}>
                      <span>Browse brackets and events</span>
                      <span>Explore</span>
                    </Link>
                  </div>

                  <div className="panel-divider"></div>

                  <button
                    type="button"
                    className="account-link"
                    onClick={handleLogoutClick}
                    disabled={busy}
                  >
                    <span>{busy ? 'Signing out...' : 'Sign out'}</span>
                    <span>Exit</span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={onLoginClick}>
                Sign in
              </button>
              <button type="button" className="btn btn-primary" onClick={onLoginClick}>
                Get started
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
