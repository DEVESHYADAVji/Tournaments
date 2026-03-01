import React from 'react';
import { Link } from 'react-router-dom';
import { getStoredUser } from '../features/auth/auth.api';
import { getAllTournaments } from '../features/tournaments/tournament.api';

const Home: React.FC = () => {
  const [count, setCount] = React.useState<number>(0);
  const [liveCount, setLiveCount] = React.useState<number>(0);
  const user = getStoredUser();

  React.useEffect(() => {
    let active = true;
    getAllTournaments().then((items) => {
      if (active) {
        setCount(items.length);
        setLiveCount(items.filter((item) => item.status === 'live').length);
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
          {user?.role === 'admin' ? (
            <Link to="/admin" className="btn btn-secondary">
              Open Admin
            </Link>
          ) : null}
        </div>
      </section>

      <section className="panel live-rail">
        <p className="eyebrow">Live Circuit</p>
        <div className="live-rail-track" aria-label="Live competition highlights">
          <span className="live-pill">Open Qualifiers</span>
          <span className="live-pill live-pill-hot">Playoffs Running</span>
          <span className="live-pill">Grand Finals Soon</span>
          <span className="live-pill">North America</span>
          <span className="live-pill">Europe</span>
          <span className="live-pill">Online Arena</span>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card panel">
          <p className="stat-label">Live Tournaments</p>
          <p className="stat-value">{liveCount}</p>
        </article>
        <article className="stat-card panel">
          <p className="stat-label">Total Tournaments</p>
          <p className="stat-value">{count}</p>
        </article>
        <article className="stat-card panel">
          <p className="stat-label">Feature Stack</p>
          <p className="stat-value">DB + Admin</p>
        </article>
      </section>

      <section className="panel bracket-preview">
        <div className="bracket-header">
          <p className="eyebrow">Bracket Preview</p>
          <h2>Championship Flow</h2>
        </div>
        <div className="bracket-grid" role="presentation">
          <div className="bracket-column">
            <p className="bracket-round">Quarterfinals</p>
            <article className="bracket-match">
              <strong>Nova Squad</strong>
              <span>vs</span>
              <strong>Zenith Five</strong>
            </article>
            <article className="bracket-match">
              <strong>Pixel Storm</strong>
              <span>vs</span>
              <strong>Iron Hawks</strong>
            </article>
          </div>
          <div className="bracket-column">
            <p className="bracket-round">Semifinal</p>
            <article className="bracket-match">
              <strong>Winner A</strong>
              <span>vs</span>
              <strong>Winner B</strong>
            </article>
          </div>
          <div className="bracket-column">
            <p className="bracket-round">Final</p>
            <article className="bracket-match bracket-final">
              <strong>Champion Slot</strong>
            </article>
          </div>
        </div>
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
