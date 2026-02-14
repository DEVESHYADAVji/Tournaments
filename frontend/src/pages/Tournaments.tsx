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

  const filtered = tournaments.filter((item) => {
    const text = `${item.name} ${item.location || ''} ${item.description || ''}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

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
              <p className="chip">{tournament.location || 'TBA'}</p>
              <h3>{tournament.name}</h3>
              <p>{tournament.description || 'Details will be published soon.'}</p>
              <div className="meta-row">
                <span>{tournament.date}</span>
                <Link to={`/tournaments/${tournament.id}`} className="btn btn-secondary">
                  View Details
                </Link>
              </div>
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
