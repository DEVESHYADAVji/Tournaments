import React from 'react';
import { Link } from 'react-router-dom';

interface Tournament {
  id: number;
  name: string;
  date: string;
  location?: string;
  description?: string;
}

const mockTournaments: Tournament[] = [
  { id: 1, name: 'Chess Championship', date: '2026-03-12', location: 'New York', description: 'A national-level chess tournament.' },
  { id: 2, name: 'Coding Challenge', date: '2026-04-05', location: 'Online', description: 'Algorithm and speed coding contest.' },
  { id: 3, name: 'Gaming League', date: '2026-05-20', location: 'Los Angeles', description: 'Esports tournament with multiple games.' },
  { id: 4, name: 'Table Tennis Cup', date: '2026-06-15', location: 'Chicago', description: 'Open table tennis competition.' },
];

const TournamentCard: React.FC<{ t: Tournament }> = ({ t }) => (
  <div className="tournament-card" style={{border: '1px solid #ddd', padding: 12, borderRadius: 6, marginBottom: 12}}>
    <h3>{t.name}</h3>
    <p style={{margin: 4}}><strong>Date:</strong> {t.date}</p>
    {t.location && <p style={{margin: 4}}><strong>Location:</strong> {t.location}</p>}
    {t.description && <p style={{margin: 4, color: '#555'}}>{t.description}</p>}
    <div style={{marginTop: 8}}>
      <Link to={`/tournaments/${t.id}`}>View Details</Link>
    </div>
  </div>
);

const TournamentList: React.FC = () => {
  return (
    <div className="tournaments-feature" style={{maxWidth: 900, margin: '0 auto', padding: 16}}>
      <h2>Tournaments</h2>
      <div className="tournaments-grid">
        {mockTournaments.map((t) => (
          <TournamentCard key={t.id} t={t} />
        ))}
      </div>
    </div>
  );
};

export default TournamentList;
