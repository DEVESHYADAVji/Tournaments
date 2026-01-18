import React from 'react';
import { Link } from 'react-router-dom';

const Tournaments: React.FC = () => {
  const tournaments = [
    { id: 1, name: 'Chess Championship' },
    { id: 2, name: 'Coding Challenge' },
    { id: 3, name: 'Gaming League' },
  ];

  return (
    <div className="tournaments-page">
      <h1>Tournaments</h1>
      <div className="tournaments-list">
        {tournaments.map((tournament) => (
          <div key={tournament.id} className="tournament-card">
            <h3>{tournament.name}</h3>
            <Link to={`/tournaments/${tournament.id}`}>View Details</Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tournaments;
