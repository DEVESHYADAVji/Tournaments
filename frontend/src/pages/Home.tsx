import React from 'react';
import { Link } from 'react-router-dom';
import TournamentCard from '../compoments/TournamentCard/TournamentCard';
import { getAllTournaments, type Tournament } from '../features/tournaments/tournament.api';

const Home: React.FC = () => {
  const [tournaments, setTournaments] = React.useState<Tournament[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    void getAllTournaments().then((items) => {
      if (active) setTournaments(items);
    }).catch(() => {
      if (active) setTournaments([]);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const featuredTournament = tournaments.find((item) => item.status === 'live') || tournaments.find((item) => item.status === 'registration_open') || tournaments[0];
  const upcomingTournaments = tournaments.slice(0, 6);
  const liveCount = tournaments.filter((item) => item.status === 'live').length;
  const openCount = tournaments.filter((item) => item.status === 'registration_open').length;
  const games = Array.from(new Set(tournaments.map((item) => item.game))).slice(0, 5);

  return (
    <div className="section-stack page-enter">
      <section className="hero-surface"><div className="hero-inner"><div className="hero-grid">
        <div className="hero-copy"><p className="section-label">Tournament platform</p><h1 className="hero-title">Find the next bracket worth joining.</h1><p>Discover tournaments, follow live competitions, and join events from one focused player experience.</p><div className="hero-actions"><Link to="/tournaments" className="btn btn-primary">Explore tournaments</Link></div></div>
        <div className="hero-feature-card"><div><p className="section-label">Featured</p><h2>{featuredTournament?.name || 'Tournament discovery ready'}</h2></div><p>{featuredTournament?.description || 'Featured events appear here when tournament data is available.'}</p><div className="metric-grid"><div className="metric-card"><div className="metric-label">Total</div><div className="metric-value">{tournaments.length}</div></div><div className="metric-card"><div className="metric-label">Live</div><div className="metric-value">{liveCount}</div></div><div className="metric-card"><div className="metric-label">Open</div><div className="metric-value">{openCount}</div></div></div>{featuredTournament ? <div className="inline-actions"><span className={`status-pill status-${featuredTournament.status}`}>{featuredTournament.status.replace('_', ' ')}</span><span className="small-pill">{featuredTournament.game}</span></div> : null}</div>
      </div></div></section>

      <section className="section-card"><div className="section-card-inner"><div className="section-header"><div><p className="section-label">Discover</p><h2>Jump into a game or live event</h2></div><Link to="/tournaments" className="btn btn-ghost">Browse all</Link></div><div className="inline-actions">{games.length ? games.map((game) => <Link key={game} to={`/tournaments?game=${encodeURIComponent(game)}`} className="chip-button">{game}</Link>) : <span className="small-pill">No games available yet</span>}<Link to="/tournaments?status=live" className="chip-button">Live now</Link><Link to="/tournaments?status=registration_open" className="chip-button">Open registration</Link></div></div></section>

      <section className="section-card"><div className="section-card-inner"><div className="section-header"><div><p className="section-label">Upcoming</p><h2>Events worth tracking</h2></div></div>{loading ? <div className="loading-view"><div className="spinner" aria-hidden="true" /><p>Loading tournaments...</p></div> : upcomingTournaments.length ? <div className="card-grid">{upcomingTournaments.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} />)}</div> : <div className="empty-state"><h3>No tournaments yet</h3><p>Once events are created, they will appear here.</p><Link to="/tournaments" className="btn btn-secondary">Explore tournaments</Link></div>}</div></section>
    </div>
  );
};

export default Home;
