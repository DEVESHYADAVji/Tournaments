import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="home-page">
      <h1>Tournament Management System</h1>
      <p>Welcome! Manage and participate in tournaments.</p>
      <nav>
        <ul>
          <li>
            <Link to="/tournaments">Browse Tournaments</Link>
          </li>
          <li>
            <Link to="/profile">My Profile</Link>
          </li>
          <li>
            <Link to="/admin">Admin Panel</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Home;
