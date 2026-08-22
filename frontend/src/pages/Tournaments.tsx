import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import TournamentCard from '../compoments/TournamentCard/TournamentCard';
import { getAllTournaments, type Tournament } from '../features/tournaments/tournament.api';

const Tournaments: React.FC = () => {
  const [tournaments, setTournaments] = React.useState<Tournament[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const params = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const urlQuery = params.get('search') || '';
  const urlStatus = params.get('status') || 'all';
  const urlGame = params.get('game') || 'all';
  const [query, setQuery] = React.useState(urlQuery);
  const [status, setStatus] = React.useState(urlStatus);
  const [game, setGame] = React.useState(urlGame);

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await getAllTournaments();
        if (active) setTournaments(data);
      } catch (error) {
        console.error('Failed to load tournaments', error);
        if (active) setLoadError('Unable to load tournaments. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    setQuery(urlQuery);
    setStatus(urlStatus);
    setGame(urlGame);
  }, [urlGame, urlQuery, urlStatus]);

  const updateFilters = React.useCallback((next: { query?: string; status?: string; game?: string }) => {
    const nextQuery = next.query ?? query;
    const nextStatus = next.status ?? status;
    const nextGame = next.game ?? game;
    const nextParams = new URLSearchParams();
    if (nextQuery.trim()) nextParams.set('search', nextQuery.trim());
    if (nextStatus !== 'all') nextParams.set('status', nextStatus);
    if (nextGame !== 'all') nextParams.set('game', nextGame);
    const search = nextParams.toString();
    navigate(`/tournaments${search ? `?${search}` : ''}`, { replace: true });
  }, [game, navigate, query, status]);

  const filtered = tournaments.filter((item) => {
    const text = `${item.name} ${item.location || ''} ${item.description || ''} ${item.game || ''}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === 'all' || item.status === status) && (game === 'all' || item.game === game);
  });

  const games = Array.from(new Set(tournaments.map((item) => item.game)));
  const liveCount = tournaments.filter((item) => item.status === 'live').length;
  const openCount = tournaments.filter((item) => item.status === 'registration_open').length;

  return (
    <div className="section-stack page-enter">
      <section className="hero-surface"><div className="hero-inner page-header-grid"><div><p className="section-label">Discover</p><h1 className="page-title">Tournament directory</h1><p>Browse by game, status, or search keyword. The interface is intentionally simple, but the structure leaves room for adding more advanced filters later.</p></div><div className="summary-grid"><div className="metric-card"><div className="metric-label">Total</div><div className="metric-value">{tournaments.length}</div></div><div className="metric-card"><div className="metric-label">Live</div><div className="metric-value">{liveCount}</div></div><div className="metric-card"><div className="metric-label">Open</div><div className="metric-value">{openCount}</div></div></div></div></section>
      <section className="discover-layout">
        <aside className="filter-shell">
          <div className="filter-card"><h3>Search</h3><input value={query} onChange={(e) => { const value = e.target.value; setQuery(value); updateFilters({ query: value }); }} placeholder="Search by name, game, or location" aria-label="Search tournaments" /></div>
          <div className="filter-card"><h3>Status</h3><div className="filter-pills">{['all', 'registration_open', 'upcoming', 'live', 'completed'].map((item) => <button key={item} type="button" className={`chip-button ${status === item ? 'active' : ''}`} onClick={() => { setStatus(item); updateFilters({ status: item }); }}>{item.replace('_', ' ')}</button>)}</div></div>
          <div className="filter-card"><h3>Game</h3><select value={game} onChange={(e) => { const value = e.target.value; setGame(value); updateFilters({ game: value }); }}><option value="all">All games</option>{games.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
        </aside>
        <div className="discover-results"><div className="section-card"><div className="section-card-inner"><div className="section-header"><div><p className="section-label">Results</p><h2>{filtered.length} tournaments found</h2></div><Link to="/" className="btn btn-ghost">Back home</Link></div>
          {loading ? <div className="loading-view"><div className="spinner" aria-hidden="true" /><p>Loading tournaments...</p></div> : loadError ? <div className="empty-state"><h3>Unable to load tournaments</h3><p>{loadError}</p></div> : filtered.length ? <div className="card-grid">{filtered.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} />)}</div> : <div className="empty-state"><h3>No tournaments found</h3><p>Try another search term or switch your filters.</p></div>}
        </div></div></div>
      </section>
    </div>
  );
};
export default Tournaments;
