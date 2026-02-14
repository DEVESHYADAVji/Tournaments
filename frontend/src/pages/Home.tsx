import React from 'react';
import { Link } from 'react-router-dom';
import { getAllTournaments } from '../features/tournaments/tournament.api';

const Home: React.FC = () => {
  const [count, setCount] = React.useState<number>(0);

  React.useEffect(() => {
    let active = true;
    getAllTournaments().then((items) => {
      if (active) {
        setCount(items.length);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="home-page page-enter">
      <section className="hero panel">
        <p className="eyebrow">Tournament Platform</p>
        <h1>Compete smarter with a modern tournament dashboard.</h1>
        <p>
          Discover events, track standings, and manage operations from one place.
        </p>
        <div className="hero-actions">
          <Link to="/tournaments" className="btn btn-primary">
            Browse Tournaments
          </Link>
          <Link to="/admin" className="btn btn-secondary">
            Open Admin
          </Link>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card panel">
          <p className="stat-label">Live Tournaments</p>
          <p className="stat-value">{count}</p>
        </article>
        <article className="stat-card panel">
          <p className="stat-label">Primary Frontend URL</p>
          <p className="stat-value">:5173</p>
        </article>
        <article className="stat-card panel">
          <p className="stat-label">Backend Health</p>
          <p className="stat-value">/health</p>
        </article>
      </section>

      <section className="quick-links panel">
        <h2>Quick Actions</h2>
        <div className="quick-links-grid">
          <Link to="/profile" className="quick-link-card">
            Manage your profile
          </Link>
          <Link to="/tournaments" className="quick-link-card">
            Explore tournament details
          </Link>
          <Link to="/admin" className="quick-link-card">
            Configure admin controls
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
