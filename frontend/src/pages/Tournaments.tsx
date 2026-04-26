import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import TournamentCard from '../compoments/TournamentCard/TournamentCard';
import { getAllTournaments, type Tournament } from '../features/tournaments/tournament.api';

const Tournaments: React.FC = () => {
  const [tournaments, setTournaments] = React.useState<Tournament[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const location = useLocation();
  const navigate = useNavigate();

  const params = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialQuery = params.get('search') || '';
  const initialStatus = params.get('status') || 'all';
  const initialGame = params.get('game') || 'all';

  const [query, setQuery] = React.useState(initialQuery);
  const [status, setStatus] = React.useState(initialStatus);
  const [game, setGame] = React.useState(initialGame);

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      const data = await getAllTournaments();
      if (active) {
        setTournaments(data);
        setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    setQuery(initialQuery);
    setStatus(initialStatus);
    setGame(initialGame);
  }, [initialGame, initialQuery, initialStatus]);

  React.useEffect(() => {
    const nextParams = new URLSearchParams();

    if (query.trim()) {
      nextParams.set('search', query.trim());
    }
    if (status !== 'all') {
      nextParams.set('status', status);
    }
    if (game !== 'all') {
      nextParams.set('game', game);
    }

    const nextSearch = nextParams.toString();
    const currentSearch = location.search.startsWith('?') ? location.search.slice(1) : location.search;
    if (nextSearch !== currentSearch) {
      navigate(`/tournaments${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
    }
  }, [game, location.search, navigate, query, status]);

  const filtered = tournaments.filter((item) => {
    const text = `${item.name} ${item.location || ''} ${item.description || ''} ${item.game || ''}`.toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesStatus = status === 'all' || item.status === status;
    const matchesGame = game === 'all' || item.game === game;
    return matchesQuery && matchesStatus && matchesGame;
  });

  const games = Array.from(new Set(tournaments.map((item) => item.game)));
  const liveCount = tournaments.filter((item) => item.status === 'live').length;
  const openCount = tournaments.filter((item) => item.status === 'registration_open').length;

  return (
    <div className="section-stack page-enter">
      <section className="hero-surface">
        <div className="hero-inner page-header-grid">
          <div>
            <p className="section-label">Discover</p>
            <h1 className="page-title">Tournament directory</h1>
            <p>
              Browse by game, status, or search keyword. The interface is intentionally simple, but the structure
              leaves room for adding more advanced filters later.
            </p>
          </div>
          <div className="summary-grid">
            <div className="metric-card">
              <div className="metric-label">Total</div>
              <div className="metric-value">{tournaments.length}</div>
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
        </div>
      </section>

      <section className="discover-layout">
        <aside className="filter-shell">
          <div className="filter-card">
            <h3>Search</h3>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, game, or location"
              aria-label="Search tournaments"
            />
          </div>

          <div className="filter-card">
            <h3>Status</h3>
            <div className="filter-pills">
              {['all', 'registration_open', 'upcoming', 'live', 'completed'].map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`chip-button ${status === item ? 'active' : ''}`}
                  onClick={() => setStatus(item)}
                >
                  {item.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-card">
            <h3>Game</h3>
            <select value={game} onChange={(e) => setGame(e.target.value)}>
              <option value="all">All games</option>
              {games.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </aside>

        <div className="discover-results">
          <div className="section-card">
            <div className="section-card-inner">
              <div className="section-header">
                <div>
                  <p className="section-label">Results</p>
                  <h2>{filtered.length} tournaments found</h2>
                </div>
                <Link to="/" className="btn btn-ghost">Back home</Link>
              </div>

              {loading ? (
                <div className="loading-view">
                  <div className="spinner" aria-hidden="true" />
                  <p>Loading tournaments...</p>
                </div>
              ) : filtered.length ? (
                <div className="card-grid">
                  {filtered.map((tournament) => (
                    <TournamentCard key={tournament.id} tournament={tournament} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>No tournaments found</h3>
                  <p>Try another search term or switch your filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Tournaments;
