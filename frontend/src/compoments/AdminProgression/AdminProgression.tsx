import React from 'react';
import type { AxiosError } from 'axios';
import { getAllTournaments, getTournamentMatches, type Match, type Tournament } from '../../features/tournaments/tournament.api';
import httpClient from '../../services/http';

const AdminProgression: React.FC = () => {
  const [tournaments, setTournaments] = React.useState<Tournament[]>([]);
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [tournamentId, setTournamentId] = React.useState('');
  const [matchId, setMatchId] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const loadMatches = React.useCallback(async () => {
    if (!tournamentId) {
      setMatches([]);
      return;
    }
    setMatches(await getTournamentMatches(Number(tournamentId)));
  }, [tournamentId]);

  React.useEffect(() => {
    void getAllTournaments().then((items: Tournament[]) => {
      setTournaments(items);
      if (items.length) setTournamentId(String(items[0].id));
    });
  }, []);

  React.useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const advance = async () => {
    if (!tournamentId || !matchId) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await httpClient.post(`/tournaments/${Number(tournamentId)}/matches/${Number(matchId)}/advance`);
      setMessage(response.data?.message || 'Winner advanced successfully.');
      await loadMatches();
    } catch (error) {
      setMessage((error as AxiosError<{ detail?: string }>)?.response?.data?.detail || 'Unable to advance winner.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section-card">
      <div className="section-card-inner">
        <div className="section-header">
          <div><p className="section-label">Bracket progression</p><h2>Advance a completed match</h2></div>
        </div>
        <div className="form-grid">
          <select value={tournamentId} onChange={(event) => setTournamentId(event.target.value)}>
            <option value="">Select tournament</option>
            {tournaments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select value={matchId} onChange={(event) => setMatchId(event.target.value)}>
            <option value="">Select finished match</option>
            {matches.filter((match) => match.status === 'finished').map((match) => <option key={match.id} value={match.id}>#{match.id} {match.winner || 'No winner'} · {match.round_name}</option>)}
          </select>
          <button type="button" className="btn btn-primary" onClick={() => void advance()} disabled={busy || !matchId}>{busy ? 'Advancing...' : 'Advance winner'}</button>
        </div>
        {message ? <p className="message-text">{message}</p> : null}
      </div>
    </section>
  );
};

export default AdminProgression;
