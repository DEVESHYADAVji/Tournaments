import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavBarProps {
  user: any;
}

const NavBar: React.FC<NavBarProps> = ({ user }) => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <NavLink to="/" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
          <span>🏠</span>
          Home
        </NavLink>
        <NavLink to="/tournaments" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
          <span>🏆</span>
          Tournaments
        </NavLink>
        <NavLink to="/ocr" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
          <span>📄</span>
          Extract Text
        </NavLink>
        {user?.role === 'admin' && (
          <NavLink to="/admin" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
            <span>⚙️</span>
            Admin
          </NavLink>
        )}
      </div>
    </nav>
  );
};

export default NavBar;
