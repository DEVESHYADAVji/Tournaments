import React from 'react';
import { Link } from 'react-router-dom';
import TournamentCard from '../compoments/TournamentCard/TournamentCard';
import { getStoredUser } from '../features/auth/auth.api';
import { getAllTournaments, type Tournament } from '../features/tournaments/tournament.api';

const Home: React.FC = () => {
  const [tournaments, setTournaments] = React.useState<Tournament[]>([]);
  const [count, setCount] = React.useState(0);
  const [liveCount, setLiveCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const user = getStoredUser();

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    getAllTournaments().then((items) => {
      if (active) {
        setTournaments(items);
        setCount(items.length);
        setLiveCount(items.filter((item) => item.status === 'live').length);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const featuredTournament =
    tournaments.find((item) => item.status === 'live') ||
    tournaments.find((item) => item.status === 'registration_open') ||
    tournaments[0];
  const upcomingTournaments = tournaments.slice(0, 6);
  const openCount = tournaments.filter((item) => item.status === 'registration_open').length;
  const games = Array.from(new Set(tournaments.map((item) => item.game))).slice(0, 5);

  return (
    <div className="section-stack page-enter">
      <section className="hero-surface">
        <div className="hero-inner">
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="section-label">Tournament platform</p>
              <h1 className="hero-title">Find the next bracket worth joining.</h1>
              <p>
                A Battlefy-inspired esports dashboard for discovering tournaments, following live competitions,
                joining events, and keeping admin actions in one clean workflow.
              </p>

              <div className="inline-actions">
                <span className="small-pill">Live operations</span>
                <span className="small-pill">Simple brackets</span>
                <span className="small-pill">Student-friendly code</span>
              </div>

              <div className="hero-actions">
                <Link to="/tournaments" className="btn btn-primary">
                  Explore tournaments
                </Link>
                <Link to={user ? '/profile' : '/ocr'} className="btn btn-secondary">
                  {user ? 'Open profile' : 'Try OCR tool'}
                </Link>
              </div>
            </div>

            <div className="hero-feature-card">
              <div>
                <p className="section-label">Featured spotlight</p>
                <h2>{featuredTournament?.name || 'Tournament discovery ready'}</h2>
              </div>
              <p>
                {featuredTournament?.description ||
                  'The homepage highlights a featured event and keeps discovery actions front and center.'}
              </p>
              <div className="metric-grid">
                <div className="metric-card">
                  <div className="metric-label">Total</div>
                  <div className="metric-value">{count}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Live</div>
                  <div className="metric-value">{liveCount}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Open</div>
                  <div className="metric-value">{openCount}</div>
                </div>
              </div>
              {featuredTournament ? (
                <div className="inline-actions">
                  <span className={`status-pill status-${featuredTournament.status}`}>{featuredTournament.status}</span>
                  <span className="small-pill">{featuredTournament.game}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="section-card">
        <div className="section-card-inner">
          <div className="section-header">
            <div>
              <p className="section-label">Live categories</p>
              <h2>Popular games and queues</h2>
            </div>
            <p>Battlefy-style discovery works best when users can jump quickly by game and event state.</p>
          </div>
          <div className="inline-actions">
            {games.length ? games.map((game) => (
              <Link key={game} to={`/tournaments?game=${encodeURIComponent(game)}`} className="chip-button">
                {game}
              </Link>
            )) : (
              <span className="small-pill">No games available yet</span>
            )}
            <Link to="/tournaments?status=live" className="chip-button">
              Live now
            </Link>
            <Link to="/tournaments?status=registration_open" className="chip-button">
              Open registration
            </Link>
          </div>
        </div>
      </section>

      <section className="section-card">
        <div className="section-card-inner">
          <div className="section-header">
            <div>
              <p className="section-label">Upcoming</p>
              <h2>Events worth tracking</h2>
            </div>
            <Link to="/tournaments" className="btn btn-ghost">View all</Link>
          </div>

          {loading ? (
            <div className="loading-view">
              <div className="spinner"></div>
              <p>Loading tournaments...</p>
            </div>
          ) : upcomingTournaments.length > 0 ? (
            <div className="card-grid">
              {upcomingTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No tournaments yet</h3>
              <p>Once events are created, they will show up here automatically.</p>
            </div>
          )}
        </div>
      </section>

      <section className="utility-grid">
        <article className="utility-card">
          <p className="section-label">Player flow</p>
          <h3>Register, join, and track your slots.</h3>
          <p>Players can browse events, join eligible tournaments, and revisit entries from the profile page.</p>
          <Link to="/profile" className="btn btn-secondary">Open profile</Link>
        </article>
        <article className="utility-card">
          <p className="section-label">Admin flow</p>
          <h3>Run operations from one dashboard.</h3>
          <p>Create tournaments, schedule matches, publish announcements, and update results without leaving the app.</p>
          <Link to={user?.role === 'admin' ? '/admin' : '/tournaments'} className="btn btn-secondary">
            {user?.role === 'admin' ? 'Open admin' : 'See events'}
          </Link>
        </article>
        <article className="utility-card">
          <p className="section-label">AI utility</p>
          <h3>Extract text from posters and screenshots.</h3>
          <p>Use the OCR tool to digitize brackets, event flyers, or any image with readable tournament information.</p>
          <Link to="/ocr" className="btn btn-secondary">Open OCR</Link>
        </article>
      </section>
    </div>
  );
};

export default Home;
