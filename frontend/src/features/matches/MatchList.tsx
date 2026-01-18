import React from 'react';
import { Link } from 'react-router-dom';

interface Match {
  id: number;
  round: string;
  playerA: string;
  playerB: string;
  score?: string;
  scheduledAt?: string;
}

const mockMatches: Match[] = [
  { id: 1, round: 'Quarterfinal', playerA: 'Alice', playerB: 'Bob', score: '2-1', scheduledAt: '2026-03-13 10:00' },
  { id: 2, round: 'Quarterfinal', playerA: 'Carol', playerB: 'Dave', score: '1-2', scheduledAt: '2026-03-13 11:30' },
  { id: 3, round: 'Semifinal', playerA: 'Alice', playerB: 'Dave', score: 'TBD', scheduledAt: '2026-03-14 14:00' },
  { id: 4, round: 'Final', playerA: 'Winner SF1', playerB: 'Winner SF2', score: 'TBD', scheduledAt: '2026-03-15 16:00' },
];

const MatchCard: React.FC<{ m: Match }> = ({ m }) => (
  <div className="match-card" style={{ border: '1px solid #e0e0e0', padding: 12, borderRadius: 6, marginBottom: 10 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 14, color: '#666' }}>{m.round}</div>
        <h4 style={{ margin: '6px 0' }}>{m.playerA} vs {m.playerB}</h4>
        <div style={{ fontSize: 13, color: '#444' }}>{m.scheduledAt}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 600 }}>{m.score}</div>
        <div style={{ marginTop: 8 }}>
          <Link to={`/matches/${m.id}`}>View</Link>
        </div>
      </div>
    </div>
  </div>
);

const MatchList: React.FC<{ tournamentId?: number | string }> = ({ tournamentId }) => {
  // In real use, we'd fetch matches for the given tournamentId.
  const matches = mockMatches;

  return (
    <div className="match-list" style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <h3>Matches {tournamentId ? `(Tournament ${tournamentId})` : ''}</h3>
      {matches.length === 0 ? (
        <p>No matches scheduled.</p>
      ) : (
        matches.map((m) => <MatchCard key={m.id} m={m} />)
      )}
    </div>
  );
};

export default MatchList;
