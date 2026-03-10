import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Tournament {
  id: number;
  name: string;
  game_name?: string;
  description?: string;
  banner_image?: string;
  status?: string;
  prize_pool?: number;
  start_date?: string;
  end_date?: string;
}

interface TournamentCardProps {
  tournament: Tournament;
}

const TournamentCard: React.FC<TournamentCardProps> = ({ tournament }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/tournaments/${tournament.id}`);
  };

  // Format date if available
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="tournament-card" onClick={handleClick}>
      <div className="tournament-image-container">
        <img
          src={tournament.banner_image || 'https://via.placeholder.com/220x180?text=' + encodeURIComponent(tournament.name)}
          alt={tournament.name}
          className="tournament-image"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/220x180?text=' + encodeURIComponent(tournament.name);
          }}
        />
        <div className="tournament-status">
          {tournament.status && <span className="status-badge">{tournament.status}</span>}
        </div>
      </div>
      <div className="tournament-info">
        <h3 className="tournament-name">{tournament.name}</h3>
        {tournament.game_name && (
          <p className="tournament-game">{tournament.game_name}</p>
        )}
        {tournament.prize_pool && (
          <p className="tournament-prize">
            💰 Prize: ${tournament.prize_pool.toLocaleString()}
          </p>
        )}
        {tournament.start_date && (
          <p className="tournament-date">
            📅 {formatDate(tournament.start_date)}
          </p>
        )}
      </div>
    </div>
  );
};

export default TournamentCard;
