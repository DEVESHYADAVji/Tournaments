import React from 'react';
import { useParams, Link } from 'react-router-dom';

interface Tournament {
  id: number;
  name: string;
  date: string;
  location?: string;
  description?: string;
  organizer?: string;
}

const placeholderTournaments: Tournament[] = [
  { id: 1, name: 'Chess Championship', date: '2026-03-12', location: 'New York', description: 'A national-level chess tournament.', organizer: 'NY Chess Club' },
  { id: 2, name: 'Coding Challenge', date: '2026-04-05', location: 'Online', description: 'Algorithm and speed coding contest.', organizer: 'Dev League' },
  { id: 3, name: 'Gaming League', date: '2026-05-20', location: 'Los Angeles', description: 'Esports tournament with multiple games.', organizer: 'ProGamers' },
  { id: 4, name: 'Table Tennis Cup', date: '2026-06-15', location: 'Chicago', description: 'Open table tennis competition.', organizer: 'Chicago Sports' },
];

const TournamentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const numericId = Number(id);

  const tournament = placeholderTournaments.find((t) => t.id === numericId) || null;

  if (!tournament) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Tournament Not Found</h2>
        <p>No tournament matches the provided ID.</p>
        <Link to="/tournaments">Back to tournaments</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <h1>{tournament.name}</h1>
      <p><strong>Date:</strong> {tournament.date}</p>
      <p><strong>Location:</strong> {tournament.location}</p>
      <p><strong>Organizer:</strong> {tournament.organizer}</p>
      <div style={{ marginTop: 12 }}>
        <h3>About</h3>
        <p>{tournament.description}</p>
      </div>

      <div style={{ marginTop: 16 }}>
        <button style={{ marginRight: 8 }}>Register</button>
        <Link to="/tournaments">Back to tournaments</Link>
      </div>
    </div>
  );
};

export default TournamentDetails;
