import React from 'react';
import type { AxiosError } from 'axios';
import { getStoredUser, isAuthenticated } from '../features/auth/auth.api';
import {
  acceptTeamInvitation,
  createTeam,
  getMyTeams,
  getTeamInvitations,
  inviteToTeam,
  type Team,
  type TeamInvitation,
} from '../features/teams/team.api';

const Teams: React.FC = () => {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [invitations, setInvitations] = React.useState<TeamInvitation[]>([]);
  const [name, setName] = React.useState('');
  const [game, setGame] = React.useState('');
  const [inviteEmail, setInviteEmail] = React.useState<Record<number, string>>({});
  const [message, setMessage] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const user = getStoredUser();

  const load = React.useCallback(async () => {
    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [teamData, invitationData] = await Promise.all([getMyTeams(), getTeamInvitations()]);
      setTeams(teamData);
      setInvitations(invitationData);
    } catch (error) {
      setMessage((error as AxiosError<{ detail?: string }>)?.response?.data?.detail || 'Unable to load teams.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await createTeam(name.trim(), game.trim());
      setName('');
      setGame('');
      setMessage('Team created successfully.');
      await load();
    } catch (error) {
      setMessage((error as AxiosError<{ detail?: string }>)?.response?.data?.detail || 'Unable to create team.');
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async (teamId: number) => {
    const email = inviteEmail[teamId]?.trim();
    if (!email) return;
    setBusy(true);
    setMessage('');
    try {
      await inviteToTeam(teamId, email);
      setInviteEmail((current) => ({ ...current, [teamId]: '' }));
      setMessage('Invitation created.');
    } catch (error) {
      setMessage((error as AxiosError<{ detail?: string }>)?.response?.data?.detail || 'Unable to invite player.');
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async (invitationId: number) => {
    setBusy(true);
    setMessage('');
    try {
      await acceptTeamInvitation(invitationId);
      setMessage('Invitation accepted.');
      await load();
    } catch (error) {
      setMessage((error as AxiosError<{ detail?: string }>)?.response?.data?.detail || 'Unable to accept invitation.');
    } finally {
      setBusy(false);
    }
  };

  if (!isAuthenticated()) {
    return (
      <section className="section-card page-enter">
        <div className="section-card-inner">
          <p className="section-label">Teams</p>
          <h1>Sign in to manage your teams.</h1>
          <p>Create rosters, invite players, and use your team for tournament registration.</p>
        </div>
      </section>
    );
  }

  return (
    <div className="section-stack page-enter">
      <section className="hero-surface">
        <div className="hero-inner">
          <p className="section-label">Competitive identity</p>
          <h1 className="hero-title">Build your roster once. Compete everywhere.</h1>
          <p>Keep your teams separate from individual identity so tournament registration can stay consistent.</p>
        </div>
      </section>

      {message ? <div className="message-text">{message}</div> : null}

      <section className="section-card">
        <div className="section-card-inner">
          <div className="section-header">
            <div>
              <p className="section-label">Create team</p>
              <h2>Start a new roster</h2>
            </div>
          </div>
          <form className="form-stack" onSubmit={handleCreate}>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Team name" required />
            <input value={game} onChange={(event) => setGame(event.target.value)} placeholder="Game" required />
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Working...' : 'Create team'}</button>
          </form>
        </div>
      </section>

      <section className="section-card">
        <div className="section-card-inner">
          <div className="section-header">
            <div>
              <p className="section-label">Your teams</p>
              <h2>Managed rosters</h2>
            </div>
          </div>
          {loading ? <div className="loading-view"><div className="spinner" /><p>Loading teams...</p></div> : teams.length ? (
            <div className="card-grid">
              {teams.map((team) => (
                <article key={team.id} className="utility-card">
                  <span className="small-pill">{team.game}</span>
                  <h3>{team.name}</h3>
                  <p>Team ID {team.id}</p>
                  {team.owner_user_id === Number(user?.id) ? (
                    <div className="inline-actions">
                      <input
                        type="email"
                        value={inviteEmail[team.id] || ''}
                        onChange={(event) => setInviteEmail((current) => ({ ...current, [team.id]: event.target.value }))}
                        placeholder="Player email"
                      />
                      <button type="button" className="btn btn-secondary" onClick={() => void handleInvite(team.id)} disabled={busy}>Invite</button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : <div className="empty-state"><h3>No teams yet</h3><p>Create your first competitive roster above.</p></div>}
        </div>
      </section>

      <section className="section-card">
        <div className="section-card-inner">
          <p className="section-label">Invitations</p>
          <h2>Pending team invites</h2>
          {invitations.length ? invitations.map((invitation) => (
            <article key={invitation.id} className="announcement-card">
              <div className="inline-actions">
                <span className="small-pill">Team #{invitation.team_id}</span>
                <span>{invitation.email}</span>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => void handleAccept(invitation.id)} disabled={busy}>Accept invitation</button>
            </article>
          )) : <div className="empty-state"><h3>No pending invitations</h3><p>Invitations from other team owners will appear here.</p></div>}
        </div>
      </section>
    </div>
  );
};

export default Teams;
