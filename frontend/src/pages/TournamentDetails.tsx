import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
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
import { isAuthenticated } from '../features/auth/auth.api';

const TournamentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = React.useState<Tournament | null>(null);
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [standings, setStandings] = React.useState<StandingRow[]>([]);
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [joining, setJoining] = React.useState(false);
  const [joinMessage, setJoinMessage] = React.useState('');

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      const tournamentId = id || '';
      const [data, matchData, standingsData, announcementsData] = await Promise.all([
        getTournamentById(tournamentId),
        getTournamentMatches(tournamentId),
        getTournamentStandings(tournamentId),
        getTournamentAnnouncements(tournamentId),
      ]);
      if (active) {
        setTournament(data);
        setMatches(matchData);
        setStandings(standingsData);
        setAnnouncements(announcementsData);
        setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="loading-view">
        <div className="spinner" aria-hidden="true" />
        <p>Loading tournament...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <section className="panel detail-page page-enter">
        <h1>Tournament Not Found</h1>
        <p>The requested tournament does not exist.</p>
        <Link to="/tournaments" className="btn btn-secondary">
          Back to Tournaments
        </Link>
      </section>
    );
  }

  const formatDate = (iso?: string | null): string => {
    if (!iso) return 'TBA';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return 'TBA';
    return `${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  const handleJoin = async () => {
    if (!id) return;
    if (!isAuthenticated()) {
      setJoinMessage('Please login as a user to join this tournament.');
      return;
    }
    setJoining(true);
    setJoinMessage('');
    try {
      const result = await joinTournament(id);
      setJoinMessage(result.message);
      const [updatedTournament, updatedStandings] = await Promise.all([
        getTournamentById(id),
        getTournamentStandings(id),
      ]);
      setTournament(updatedTournament);
      setStandings(updatedStandings);
    } catch (error: any) {
      setJoinMessage(error?.response?.data?.detail || 'Unable to join tournament.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <section className="detail-page page-enter">
      <article className="panel" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=1200&h=400&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', minHeight: '280px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(13, 13, 13, 0.93), rgba(26, 26, 26, 0.93))' }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p className="eyebrow" style={{ color: '#ffc107' }}>Tournament #{tournament.id}</p>
          <h1 style={{ color: '#ffffff' }}>{tournament.name}</h1>
          <p style={{ color: '#cccccc' }}>{tournament.description || 'No description is available yet.'}</p>
          <div className="detail-grid" style={{ marginTop: '20px' }}>
            <div>
              <p className="detail-label">📅 Date</p>
              <p style={{ color: '#ffffff' }}>{formatDate(tournament.start_date)}</p>
            </div>
            <div>
              <p className="detail-label">📍 Location</p>
              <p style={{ color: '#ffffff' }}>{tournament.location || 'TBA'}</p>
            </div>
            <div>
              <p className="detail-label">🎮 Game</p>
              <p style={{ color: '#ffffff' }}>{tournament.game}</p>
            </div>
            <div>
              <p className="detail-label">🏆 Prize Pool</p>
              <p style={{ color: '#ffc107', fontWeight: '600' }}>${Number(tournament.prize_pool || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="detail-label">👥 Slots</p>
              <p style={{ color: '#ffffff' }}>
                {tournament.participants_count}/{tournament.max_teams}
              </p>
            </div>
            <div>
              <p className="detail-label">📋 Format</p>
              <p style={{ color: '#ffffff' }}>{tournament.format}</p>
            </div>
          </div>
          <div className="cta-row" style={{ marginTop: '20px' }}>
            <button
              className="btn btn-primary"
              onClick={handleJoin}
              disabled={joining || tournament.is_registered}
            >
              {tournament.is_registered ? '✅ Registered' : joining ? 'Joining...' : '⚡ Join Tournament'}
            </button>
            <Link to="/tournaments" className="btn btn-secondary">
              ← Back to Tournaments
            </Link>
          </div>
          {joinMessage ? <p className="message-text" style={{ marginTop: '15px', color: '#ffc107' }}>{joinMessage}</p> : null}
        </div>
      </article>

      <article className="panel" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1552109211-7649a8bfb54e?w=1200&h=300&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', marginTop: '30px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(13, 13, 13, 0.92)' }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ color: '#ffc107', marginBottom: '20px' }}>🥇 Standings</h2>
          {standings.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Team</th>
                    <th>Points</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row) => (
                    <tr key={`${row.user_id}-${row.team_name}`}>
                      <td>#{row.rank}</td>
                      <td>{row.team_name}</td>
                      <td className="status-cell">{row.points}</td>
                      <td>{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#95a7c7' }}>No standings yet. Registrations will appear here.</p>
          )}
        </div>
      </article>

      <article className="panel" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1460647926306-322e0efc209c?w=1200&h=300&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', marginTop: '30px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(13, 13, 13, 0.92)' }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ color: '#ffc107', marginBottom: '20px' }}>⚔️ Match Schedule</h2>
          {matches.length ? (
            <div className="tournaments-grid">
              {matches.map((match) => (
                <div key={match.id} className="panel tournament-card" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1538481143235-5d630da30f33?w=300&h=250&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)' }}></div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <p className="chip" style={{ background: '#c50000' }}>{match.round_name}</p>
                    <h3 style={{ color: '#ffffff', marginTop: '10px', fontSize: '16px' }}>
                      {match.team_a} 🆚 {match.team_b}
                    </h3>
                    <p style={{ color: '#ffc107', marginTop: '8px' }}>Status: {match.status}</p>
                    <p style={{ color: '#cccccc', fontSize: '12px' }}>Schedule: {formatDate(match.scheduled_at)}</p>
                    {match.status === 'finished' ? (
                      <p style={{ color: '#4caf50', fontWeight: '600', marginTop: '8px' }}>
                        Score: {match.team_a_score} - {match.team_b_score} | Winner: {match.winner || 'N/A'}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#95a7c7' }}>Match schedule will be published soon.</p>
          )}
        </div>
      </article>

      <article className="panel" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1551431009-381d36ac3a14?w=1200&h=300&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', marginTop: '30px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(13, 13, 13, 0.92)' }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ color: '#ffc107', marginBottom: '20px' }}>📢 Announcements</h2>
          {announcements.length ? (
            <div className="detail-page">
              {announcements.map((item) => (
                <div key={item.id} className="panel" style={{ borderLeft: '4px solid #c50000' }}>
                  <h3 style={{ color: '#ffffff' }}>{item.title}</h3>
                  <p style={{ color: '#cccccc' }}>{item.content}</p>
                  <p className="detail-label" style={{ color: '#95a7c7' }}>📅 {formatDate(item.created_at)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#95a7c7' }}>No announcements yet.</p>
          )}
        </div>
      </article>
    </section>
  );
};

export default TournamentDetails;
