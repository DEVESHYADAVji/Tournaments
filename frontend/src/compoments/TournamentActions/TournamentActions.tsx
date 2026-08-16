import React from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { getStoredUser, isAdmin, isAuthenticated } from '../features/auth/auth.api';
import { getTournamentById, type Tournament } from '../features/tournaments/tournament.api';
import httpClient from '../services/http';

const TournamentActions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = React.useState<Tournament | null>(null);
  const [message, setMessage] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const user = getStoredUser();

  React.useEffect(() => {
    if (!id || !isAuthenticated()) return;
    void getTournamentById(id).then(setTournament);
  }, [id]);

  const handleCheckIn = async () => {
    if (!id) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await httpClient.post(`/tournaments/${Number(id)}/check-in`);
      setMessage(response.data?.status === 'checked_in' ? 'You are checked in.' : 'Check-in completed.');
    } catch (error) {
      setMessage((error as AxiosError<{ detail?: string }>)?.response?.data?.detail || 'Unable to check in.');
    } finally {
      setBusy(false);
    }
  };

  if (!id || (!user && !isAdmin())) return null;

  return (
    <div className="section-card tournament-action-bar">
      <div className="section-card-inner">
        <div>
          <p className="section-label">Tournament operations</p>
          <p>{tournament?.is_registered ? 'Your registration is active. Check in when the event window opens.' : 'Manage your tournament participation from here.'}</p>
        </div>
        <div className="inline-actions">
          {isAuthenticated() && tournament?.is_registered ? <button type="button" className="btn btn-primary" onClick={() => void handleCheckIn()} disabled={busy}>{busy ? 'Checking in...' : 'Check in'}</button> : null}
          {isAdmin() ? <Link to={`/tournaments/${id}/bracket`} className="btn btn-secondary">Open bracket</Link> : null}
        </div>
        {message ? <p className="message-text">{message}</p> : null}
      </div>
    </div>
  );
};

export default TournamentActions;
