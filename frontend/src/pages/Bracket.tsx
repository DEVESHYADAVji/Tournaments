import React from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { isAdmin } from '../features/auth/auth.api';
import { getTournamentById, type Tournament } from '../features/tournaments/tournament.api';
import httpClient from '../services/http';

interface BracketSlot {
  round_name: string;
  match_number: number;
  team_a?: string | null;
  team_b?: string | null;
  bracket: string;
  bye: boolean;
}

const Bracket: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = React.useState<Tournament | null>(null);
  const [slots, setSlots] = React.useState<BracketSlot[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    const load = async () => {
      if (!id || !isAdmin()) {
        setMessage('Admin access is required to view the generated bracket.');
        setLoading(false);
        return;
      }
      try {
        const tournamentData = await getTournamentById(id);
        setTournament(tournamentData);
        const response = await httpClient.get(`/tournaments/${Number(id)}/bracket`);
        setSlots(response.data as BracketSlot[]);
      } catch (error) {
        setMessage((error as AxiosError<{ detail?: string }>)?.response?.data?.detail || 'Unable to load bracket.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  if (loading) {
    return <div className="loading-view"><div className="spinner" /><p>Generating bracket...</p></div>;
  }

  if (message || !tournament) {
    return (
      <section className="section-card page-enter">
        <div className="section-card-inner">
          <h1>Bracket unavailable</h1>
          <p>{message || 'Tournament not found.'}</p>
          <Link to={id ? `/tournaments/${id}` : '/tournaments'} className="btn btn-secondary">Back to tournament</Link>
        </div>
      </section>
    );
  }

  const rounds = Array.from(new Set(slots.map((slot) => slot.round_name)));

  return (
    <div className="section-stack page-enter">
      <section className="hero-surface">
        <div className="hero-inner">
          <p className="section-label">Bracket engine</p>
          <h1 className="page-title">{tournament.name}</h1>
          <p>{tournament.format} · Generated from checked-in participants.</p>
          <Link to={`/tournaments/${tournament.id}`} className="btn btn-secondary">Back to tournament</Link>
        </div>
      </section>
      <section className="section-card">
        <div className="section-card-inner">
          <div className="bracket-scroll">
            {rounds.map((round) => (
              <div key={round} className="bracket-round">
                <p className="section-label">{round}</p>
                {slots.filter((slot) => slot.round_name === round).map((slot) => (
                  <article key={`${slot.round_name}-${slot.match_number}`} className="match-card">
                    <span className="small-pill">Match {slot.match_number}</span>
                    <div className="bracket-team">{slot.team_a || 'TBD'}</div>
                    <div className="bracket-team">{slot.team_b || 'TBD'}</div>
                    {slot.bye ? <span className="message-success">Bye</span> : null}
                  </article>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Bracket;
