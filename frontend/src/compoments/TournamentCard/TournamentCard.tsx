import React from 'react';
import { Link } from 'react-router-dom';
import type { Tournament } from '../../features/tournaments/tournament.api';

interface TournamentCardProps {
  tournament: Tournament;
}

const gradients = [
  'linear-gradient(135deg, #312e81, #0f172a 62%, #2563eb)',
  'linear-gradient(135deg, #4a044e, #111827 62%, #db2777)',
  'linear-gradient(135deg, #052e16, #0f172a 62%, #16a34a)',
  'linear-gradient(135deg, #431407, #111827 62%, #ea580c)',
];

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'TBA';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'TBA';
  }
};

const statusLabel = (status?: string) => {
  const map: Record<string, string> = {
    registration_open: 'Registration Open',
    upcoming: 'Upcoming',
    live: 'Live',
    completed: 'Completed',
  };

  return map[status || ''] || 'Upcoming';
};

const TournamentCard: React.FC<TournamentCardProps> = ({ tournament }) => {
  const accent = gradients[tournament.id % gradients.length];

  return (
    <Link to={`/tournaments/${tournament.id}`} className="tournament-card-link">
      <article className="tournament-card">
        <div className="card-banner" style={{ background: accent }}>
          <div className="card-banner-content">
            <span className="game-tag">{tournament.game}</span>
            <h3 className="card-title">{tournament.name}</h3>
            <span className={`status-pill status-${tournament.status}`}>{statusLabel(tournament.status)}</span>
          </div>
        </div>

        <div className="card-summary">
          {tournament.description || 'Tournament details will be announced soon.'}
        </div>

        <div className="card-meta-grid">
          <div>
            <div className="meta-label">Starts</div>
            <div className="meta-value">{formatDate(tournament.start_date)}</div>
          </div>
          <div>
            <div className="meta-label">Prize pool</div>
            <div className="meta-value">${Number(tournament.prize_pool || 0).toLocaleString()}</div>
          </div>
          <div>
            <div className="meta-label">Slots</div>
            <div className="meta-value">{tournament.participants_count}/{tournament.max_teams}</div>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default TournamentCard;
