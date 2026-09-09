import React from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import {
  checkInTournament,
  getTournamentAnnouncements,
  getTournamentById,
  getTournamentMatches,
  getTournamentStandings,
  joinTournament,
  type Announcement,
  type Match,
  type StandingRow,
  type Tournament,
} from '../features/tournaments/tournament.api';
import { getStoredUser, isAuthenticated } from '../features/auth/auth.api';
import { VITE_API_BASE_URL } from '../config/env';

interface ApiErrorShape { detail?: string; }
interface LiveMatch extends Match { }
interface LivePayload { status: string; matches: LiveMatch[]; }
type DetailTab = 'overview' | 'standings' | 'matches' | 'announcements';

const validTabs: DetailTab[] = ['overview', 'standings', 'matches', 'announcements'];

const TournamentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tournament, setTournament] = React.useState<Tournament | null>(null);
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [standings, setStandings] = React.useState<StandingRow[]>([]);
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [liveData, setLiveData] = React.useState<LivePayload | null>(null);
  const [liveConnected, setLiveConnected] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [joining, setJoining] = React.useState(false);
  const [checkingIn, setCheckingIn] = React.useState(false);
  const [message, setMessage] = React.useState('');

  const requestedTab = searchParams.get('tab') as DetailTab | null;
  const activeTab: DetailTab = requestedTab && validTabs.includes(requestedTab) ? requestedTab : 'overview';
  const user = getStoredUser();

  const setTab = (tab: DetailTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'overview') next.delete('tab');
    else next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMessage('');
    try {
      const [data, matchData, standingsData, announcementsData] = await Promise.all([
        getTournamentById(id),
        getTournamentMatches(id),
        getTournamentStandings(id),
        getTournamentAnnouncements(id),
      ]);
      setTournament(data);
      setMatches(matchData);
      setStandings(standingsData);
      setAnnouncements(announcementsData);
    } catch (error: unknown) {
      setMessage((error as AxiosError<ApiErrorShape>)?.response?.data?.detail || 'Unable to load tournament details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => { void load(); }, [load]);

  React.useEffect(() => {
    if (!id || !isAuthenticated()) return;
    const source = new EventSource(`${VITE_API_BASE_URL}/tournaments/${Number(id)}/stream`);
    source.addEventListener('tournament_update', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as LivePayload;
        setLiveData(payload);
        setLiveConnected(true);
      } catch {
        setLiveConnected(false);
      }
    });
    source.onerror = () => setLiveConnected(false);
    return () => source.close();
  }, [id]);

  const formatDate = (iso?: string | null): string => {
    if (!iso) return 'TBA';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return 'TBA';
    return `${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleJoin = async () => {
    if (!id) return;
    if (!isAuthenticated()) {
      setMessage('Please sign in as a player to join this tournament.');
      return;
    }
    setJoining(true);
    setMessage('');
    try {
      const result = await joinTournament(id);
      setMessage(result.message);
      await load();
    } catch (error: unknown) {
      setMessage((error as AxiosError<ApiErrorShape>)?.response?.data?.detail || 'Unable to join tournament.');
    } finally {
      setJoining(false);
    }
  };

  const handleCheckIn = async () => {
    if (!id) return;
    setCheckingIn(true);
    setMessage('');
    try {
      const result = await checkInTournament(id);
      setMessage(`Check-in complete for ${result.team_name}.`);
      await load();
    } catch (error: unknown) {
      setMessage((error as AxiosError<ApiErrorShape>)?.response?.data?.detail || 'Unable to check in.');
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) return <div className="loading-view"><div className="spinner" aria-hidden="true" /><p>Loading tournament...</p></div>;

  if (!tournament) {
    return <section className="section-card page-enter"><div className="section-card-inner"><h1>Tournament not found</h1><p>{message || 'The requested tournament does not exist.'}</p><Link to="/tournaments" className="btn btn-secondary">Back to tournaments</Link></div></section>;
  }

  const displayedMatches = liveData?.matches?.length ? liveData.matches : matches;
  const canJoin = tournament.status === 'registration_open' && !tournament.is_registered;
  const canCheckIn = Boolean(tournament.is_registered && user && !['completed'].includes(tournament.status));

  return (
    <section className="section-stack page-enter">
      <article className="hero-surface">
        <div className="hero-inner">
          <div className="inline-actions">
            <span className="section-label">Tournament #{tournament.id}</span>
            <span className={`status-pill status-${tournament.status}`}>{tournament.status.replace('_', ' ')}</span>
            <span className="small-pill">{tournament.game}</span>
          </div>
          <h1 className="page-title">{tournament.name}</h1>
          <p>{tournament.description || 'Tournament details will be announced soon.'}</p>
          <div className="detail-grid">
            <div><div className="meta-label">Starts</div><div className="meta-value">{formatDate(tournament.start_date)}</div></div>
            <div><div className="meta-label">Location</div><div className="meta-value">{tournament.location || 'TBA'}</div></div>
            <div><div className="meta-label">Prize pool</div><div className="meta-value">${Number(tournament.prize_pool || 0).toLocaleString()}</div></div>
            <div><div className="meta-label">Format</div><div className="meta-value">{tournament.format}</div></div>
            <div><div className="meta-label">Participants</div><div className="meta-value">{tournament.participants_count}/{tournament.max_teams}</div></div>
            <div><div className="meta-label">Matches</div><div className="meta-value">{tournament.matches_count}</div></div>
          </div>
          <div className="cta-row">
            {canJoin ? <button className="btn btn-primary" onClick={() => void handleJoin()} disabled={joining}>{joining ? 'Joining...' : 'Join tournament'}</button> : null}
            {tournament.is_registered ? <span className="small-pill">Registered</span> : null}
            {canCheckIn ? <button className="btn btn-secondary" onClick={() => void handleCheckIn()} disabled={checkingIn}>{checkingIn ? 'Checking in...' : 'Check in'}</button> : null}
            <Link to="/tournaments" className="btn btn-ghost">Back to tournaments</Link>
          </div>
          {message ? <p className="message-text" role="status">{message}</p> : null}
        </div>
      </article>

      <section className="section-card">
        <div className="section-card-inner">
          <div className="inline-actions" role="tablist" aria-label="Tournament information">
            {validTabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} className={`tab-button ${activeTab === tab ? 'active' : ''}`} onClick={() => setTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}
          </div>
        </div>
      </section>

      {activeTab === 'overview' ? <section className="section-card"><div className="section-card-inner overview-grid">
        <div className="info-card"><p className="section-label">Overview</p><h3>Everything you need for this event</h3><p>{tournament.description || 'Registration, standings, matches, and organizer updates are available in the tabs above.'}</p></div>
        <div className="info-card"><p className="section-label">Live status</p><h3>{liveData ? 'Live data available' : 'Waiting for live updates'}</h3><div className="inline-actions"><span className="small-pill">{liveConnected ? 'Connected' : 'Standby'}</span><span className="small-pill">{tournament.format}</span><span className="small-pill">{tournament.game}</span></div></div>
      </div></section> : null}

      {activeTab === 'standings' ? <section className="section-card"><div className="section-card-inner"><div className="section-header"><div><p className="section-label">Leaderboard</p><h2>Current standings</h2></div></div>{standings.length ? <div className="table-wrap"><table className="standings-table"><thead><tr><th>Rank</th><th>Team</th><th>Points</th><th>Status</th></tr></thead><tbody>{standings.map((row) => <tr key={`${row.user_id}-${row.team_name}`}><td>#{row.rank}</td><td>{row.team_name}</td><td>{row.points}</td><td>{row.status}</td></tr>)}</tbody></table></div> : <div className="empty-state"><h3>No standings yet</h3><p>Registrations and match results will populate this table.</p></div>}</div></section> : null}

      {activeTab === 'matches' ? <section className="section-card"><div className="section-card-inner"><div className="section-header"><div><p className="section-label">Schedule</p><h2>Match list</h2></div><span className="small-pill">{liveConnected ? 'Live' : 'Current data'}</span></div>{displayedMatches.length ? <div className="schedule-list">{displayedMatches.map((match) => <article key={match.id} className="match-card"><div className="inline-actions"><span className="small-pill">{match.round_name}</span><span className={`status-pill status-${match.status === 'finished' ? 'completed' : tournament.status}`}>{match.status}</span></div><div className="inline-actions"><span className="meta-value">{match.team_a}</span><span className="small-pill">vs</span><span className="meta-value">{match.team_b}</span></div><p>Scheduled: {formatDate(match.scheduled_at)}</p>{match.status === 'finished' ? <p className="message-success">Score {match.team_a_score} - {match.team_b_score} · Winner: {match.winner || 'N/A'}</p> : null}</article>)}</div> : <div className="empty-state"><h3>No matches scheduled</h3><p>Matchups will appear here when they are published.</p></div>}</div></section> : null}

      {activeTab === 'announcements' ? <section className="section-card"><div className="section-card-inner"><div className="section-header"><div><p className="section-label">Updates</p><h2>Announcements</h2></div></div>{announcements.length ? <div className="announcement-list">{announcements.map((item) => <article key={item.id} className="announcement-card"><h3>{item.title}</h3><p>{item.content}</p><span className="meta-label">{formatDate(item.created_at)}</span></article>)}</div> : <div className="empty-state"><h3>No announcements yet</h3><p>Organizer updates will appear here when published.</p></div>}</div></section> : null}

      <aside className="details-sidebar">
        <div className="side-stat-card"><span className="meta-label">Registration</span><span className="meta-value">{tournament.participants_count}/{tournament.max_teams} slots filled</span></div>
        <div className="side-stat-card"><span className="meta-label">Current status</span><span className={`status-pill status-${tournament.status}`}>{tournament.status.replace('_', ' ')}</span></div>
      </aside>
    </section>
  );
};

export default TournamentDetails;
