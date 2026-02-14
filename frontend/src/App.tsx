import React from 'react';
import { BrowserRouter, NavLink } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-badge">T</span>
            <div>
              <p className="brand-title">Tournaments</p>
              <p className="brand-subtitle">Play. Track. Win.</p>
            </div>
          </div>
          <nav className="topbar-nav" aria-label="Main">
            <NavLink to="/" className="nav-link">
              Home
            </NavLink>
            <NavLink to="/tournaments" className="nav-link">
              Tournaments
            </NavLink>
            <NavLink to="/profile" className="nav-link">
              Profile
            </NavLink>
            <NavLink to="/admin" className="nav-link">
              Admin
            </NavLink>
          </nav>
        </header>
        <main className="page-wrap">
          <AppRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
