import React from 'react';
import { useParams } from 'react-router-dom';
import { isAuthenticated } from '../../features/auth/auth.api';

interface LiveMatch { id: number; round_name: string; team_a: string; team_b: string; team_a_score: number | null; team_b_score: number | null; winner: string | null; status: string; }
interface LivePayload { status: string; matches: LiveMatch[]; }

const TournamentLiveFeed: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = React.useState<LivePayload | null>(null);
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    if (!id || !isAuthenticated()) return;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const source = new EventSource(`${baseUrl}/tournaments/${Number(id)}/stream`);
    source.addEventListener('tournament_update', (event) => {
      setData(JSON.parse((event as MessageEvent).data) as LivePayload);
      setConnected(true);
    });
    source.onerror = () => setConnected(false);
    return () => source.close();
  }, [id]);

  if (!data) return null;

  return (
    <section className="section-card live-feed">
      <div className="section-card-inner">
        <div className="section-header"><div><p className="section-label">Live updates</p><h2>Tournament pulse</h2></div><span className="small-pill">{connected ? 'Connected' : 'Reconnecting'}</span></div>
        <div className="card-grid">{data.matches.map((match) => <article key={match.id} className="match-card"><span className="small-pill">{match.round_name}</span><div className="bracket-team">{match.team_a} <strong>{match.team_a_score ?? '-'}</strong></div><div className="bracket-team">{match.team_b} <strong>{match.team_b_score ?? '-'}</strong></div><p>{match.status}{match.winner ? ` · Winner: ${match.winner}` : ''}</p></article>)}</div>
      </div>
    </section>
  );
};

export default TournamentLiveFeed;
