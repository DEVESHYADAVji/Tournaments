import React from 'react';
import { useParams, Link } from 'react-router-dom';

const TournamentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="tournament-details-page">
      <h1>Tournament Details</h1>
      <p>Tournament ID: {id}</p>
      <div className="tournament-info">
        <h2>Tournament Name</h2>
        <p>Details about the tournament will be displayed here.</p>
        <button>Register</button>
        <Link to="/tournaments">Back to Tournaments</Link>
      </div>
    </div>
  );
};

export default TournamentDetails;
