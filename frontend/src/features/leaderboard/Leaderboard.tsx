import React from 'react';

interface Player {
  id: number;
  name: string;
  rank: number;
  points: number;
  country?: string;
}

const mockPlayers: Player[] = [
  { id: 1, name: 'Alice Johnson', rank: 1, points: 1540, country: 'USA' },
  { id: 2, name: 'Bob Smith', rank: 2, points: 1490, country: 'UK' },
  { id: 3, name: 'Carlos Ruiz', rank: 3, points: 1425, country: 'Spain' },
  { id: 4, name: 'Diana Lee', rank: 4, points: 1380, country: 'South Korea' },
  { id: 5, name: 'Eve Park', rank: 5, points: 1340, country: 'Canada' },
];

const Leaderboard: React.FC = () => {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <h2>Leaderboard</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '8px 6px' }}>Rank</th>
            <th style={{ padding: '8px 6px' }}>Player</th>
            <th style={{ padding: '8px 6px' }}>Points</th>
            <th style={{ padding: '8px 6px' }}>Country</th>
          </tr>
        </thead>
        <tbody>
          {mockPlayers.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '10px 6px', width: 80 }}>{p.rank}</td>
              <td style={{ padding: '10px 6px' }}>{p.name}</td>
              <td style={{ padding: '10px 6px' }}>{p.points}</td>
              <td style={{ padding: '10px 6px' }}>{p.country}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
