import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfileIcon } from '../../config/profileIcons';

interface HeaderProps {
  user: any;
  loggedIn: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  busy?: boolean;
}

const Header: React.FC<HeaderProps> = ({ user, loggedIn, onLoginClick, onLogoutClick, busy }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to tournaments page with search query
      navigate(`/tournaments?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleProfileClick = () => {
    setProfileMenuOpen(!profileMenuOpen);
  };

  const handleGoToProfile = () => {
    navigate('/profile');
    setProfileMenuOpen(false);
  };

  const handleLogoutClick = () => {
    onLogoutClick();
    setProfileMenuOpen(false);
  };

  return (
    <header className="amazon-header">
      <div className="header-top">
        {/* Logo Section */}
        <div className="header-logo" onClick={() => navigate('/')}>
          <div className="logo-badge">T</div>
          <div className="logo-text">
            <div className="logo-title">Tournaments</div>
            <div className="logo-subtitle">Play. Track. Win.</div>
          </div>
        </div>

        {/* Search Bar */}
        <form className="header-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search tournaments, games, news..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
        </form>

        {/* User Account Section */}
        <div className="header-account">
          {loggedIn && user ? (
            <div className="profile-dropdown-wrapper">
              <button 
                type="button"
                className="user-profile"
                onClick={handleProfileClick}
              >
                <div className="profile-icon">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: getProfileIcon(user.profile_icon)
                    }}
                  />
                </div>
                <div className="user-info">
                  <div className="user-greeting">Hello</div>
                  <div className="user-name">{user.name || user.email}</div>
                </div>
              </button>

              {profileMenuOpen && (
                <>
                  <div className="profile-dropdown-backdrop" onClick={() => setProfileMenuOpen(false)} />
                  <div className="profile-dropdown-menu">
                    <div className="profile-menu-header">
                      <div className="profile-menu-icon">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: getProfileIcon(user.profile_icon)
                          }}
                        />
                      </div>
                      <div className="profile-menu-info">
                        <p className="profile-menu-name">{user.name || user.email}</p>
                        <p className="profile-menu-email">{user.email}</p>
                        {user.role === 'admin' && (
                          <span className="profile-menu-role">Admin</span>
                        )}
                      </div>
                    </div>
                    <div className="profile-dropdown-divider"></div>
                    <button
                      type="button"
                      className="profile-menu-item"
                      onClick={handleGoToProfile}
                    >
                      <span className="profile-menu-icon-small">👤</span>
                      Your Profile
                    </button>
                    {user.role === 'admin' && (
                      <button
                        type="button"
                        className="profile-menu-item"
                        onClick={() => {
                          navigate('/admin');
                          setProfileMenuOpen(false);
                        }}
                      >
                        <span className="profile-menu-icon-small">⚙️</span>
                        Admin Panel
                      </button>
                    )}
                    <div className="profile-dropdown-divider"></div>
                    <button
                      type="button"
                      className="profile-menu-item danger"
                      onClick={handleLogoutClick}
                      disabled={busy}
                    >
                      <span className="profile-menu-icon-small">🚪</span>
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary header-login-btn"
              onClick={onLoginClick}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
