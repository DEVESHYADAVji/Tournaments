import React from 'react';
import { Link } from 'react-router-dom';
import { getAllTournaments, type Tournament } from '../features/tournaments/tournament.api';

const Tournaments: React.FC = () => {
  const [tournaments, setTournaments] = React.useState<Tournament[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [query, setQuery] = React.useState<string>('');

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

  const formatDate = (iso?: string | null): string => {
    if (!iso) return 'TBA';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return 'TBA';
    return parsed.toLocaleDateString();
  };

  const filtered = tournaments.filter((item) => {
    const text = `${item.name} ${item.location || ''} ${item.description || ''} ${item.game || ''}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const getStatusLabel = (status: string): string => {
    const map: Record<string, string> = {
      registration_open: 'Registration Open',
      upcoming: 'Upcoming',
      live: 'Live',
      completed: 'Completed',
    };
    return map[status] || 'Upcoming';
  };

  return (
    <div className="tournaments-page page-enter">
      <section className="panel page-header">
        <div>
          <p className="eyebrow">Discover</p>
          <h1>Tournaments</h1>
        </div>
        <input
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or location"
          aria-label="Search tournaments"
        />
      </section>

      {loading ? (
        <div className="loading-view">
          <div className="spinner" aria-hidden="true" />
          <p>Loading tournaments...</p>
        </div>
      ) : (
        <div className="tournaments-grid">
          {filtered.map((tournament) => (
            <article key={tournament.id} className="panel tournament-card">
              <div className="tournament-card-head">
                <p className="chip">{tournament.game}</p>
                <span className="status-pill">{getStatusLabel(tournament.status)}</span>
              </div>
              <h3 className="tournament-title">{tournament.name}</h3>
              <p className="meta-label">{tournament.format}</p>
              <p>{tournament.description || 'Details will be published soon.'}</p>
              <div className="tournament-meta-grid">
                <div>
                  <p className="meta-label">Start Date</p>
                  <p className="meta-value">{formatDate(tournament.start_date)}</p>
                </div>
                <div>
                  <p className="meta-label">Prize Pool</p>
                  <p className="meta-value">${Number(tournament.prize_pool || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="meta-label">Registered</p>
                  <p className="meta-value">
                    {tournament.participants_count}/{tournament.max_teams}
                  </p>
                </div>
              </div>
              <div className="meta-row">
                <span>{tournament.location || 'Online/TBA'}</span>
                <Link to={`/tournaments/${tournament.id}`} className="btn btn-secondary">
                  View Details
                </Link>
              </div>
              {tournament.is_registered ? <p className="profile-status">You are registered</p> : null}
            </article>
          ))}

          {!filtered.length && (
            <article className="panel">
              <h3>No tournaments found</h3>
              <p>Try a different search keyword.</p>
            </article>
          )}
        </div>
      )}

      <div className="cta-row">
        <Link to="/" className="btn btn-ghost">
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default Tournaments;
