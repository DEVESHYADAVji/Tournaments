import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTournamentById, type Tournament } from '../features/tournaments/tournament.api';

const TournamentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = React.useState<Tournament | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [registered, setRegistered] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      const data = await getTournamentById(id || '');
      if (active) {
        setTournament(data);
        setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="loading-view">
        <div className="spinner" aria-hidden="true" />
        <p>Loading tournament...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <section className="panel detail-page page-enter">
        <h1>Tournament Not Found</h1>
        <p>The requested tournament does not exist.</p>
        <Link to="/tournaments" className="btn btn-secondary">
          Back to Tournaments
        </Link>
      </section>
    );
  }

  return (
    <section className="detail-page page-enter">
      <article className="panel">
        <p className="eyebrow">Tournament #{tournament.id}</p>
        <h1>{tournament.name}</h1>
        <p>{tournament.description || 'No description is available yet.'}</p>
        <div className="detail-grid">
          <div>
            <p className="detail-label">Date</p>
            <p>{tournament.date}</p>
          </div>
          <div>
            <p className="detail-label">Location</p>
            <p>{tournament.location || 'TBA'}</p>
          </div>
          <div>
            <p className="detail-label">Organizer</p>
            <p>{tournament.organizer || 'Tournament Committee'}</p>
          </div>
        </div>
        <div className="cta-row">
          <button
            className="btn btn-primary"
            onClick={() => setRegistered(true)}
            disabled={registered}
          >
            {registered ? 'Registered' : 'Register Now'}
          </button>
          <Link to="/tournaments" className="btn btn-secondary">
            Back to Tournaments
          </Link>
        </div>
      </article>
    </section>
  );
};

export default TournamentDetails;
