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
      <article className="panel">
        <p className="eyebrow">Tournament #{tournament.id}</p>
        <h1>{tournament.name}</h1>
        <p>{tournament.description || 'No description is available yet.'}</p>
        <div className="detail-grid">
          <div>
            <p className="detail-label">Date</p>
            <p>{formatDate(tournament.start_date)}</p>
          </div>
          <div>
            <p className="detail-label">Location</p>
            <p>{tournament.location || 'TBA'}</p>
          </div>
          <div>
            <p className="detail-label">Format</p>
            <p>{tournament.format}</p>
          </div>
          <div>
            <p className="detail-label">Game</p>
            <p>{tournament.game}</p>
          </div>
          <div>
            <p className="detail-label">Prize Pool</p>
            <p>${Number(tournament.prize_pool || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="detail-label">Slots</p>
            <p>
              {tournament.participants_count}/{tournament.max_teams}
            </p>
          </div>
        </div>
        <div className="cta-row">
          <button
            className="btn btn-primary"
            onClick={handleJoin}
            disabled={joining || tournament.is_registered}
          >
            {tournament.is_registered ? 'Registered' : joining ? 'Joining...' : 'Join Tournament'}
          </button>
          <Link to="/tournaments" className="btn btn-secondary">
            Back to Tournaments
          </Link>
        </div>
        {joinMessage ? <p className="message-text">{joinMessage}</p> : null}
      </article>

      <article className="panel">
        <h2>Standings</h2>
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
                    <td>{row.points}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No standings yet. Registrations will appear here.</p>
        )}
      </article>

      <article className="panel">
        <h2>Match Schedule</h2>
        {matches.length ? (
          <div className="tournaments-grid">
            {matches.map((match) => (
              <div key={match.id} className="panel tournament-card">
                <p className="chip">{match.round_name}</p>
                <h3>
                  {match.team_a} vs {match.team_b}
                </h3>
                <p>Status: {match.status}</p>
                <p>Schedule: {formatDate(match.scheduled_at)}</p>
                {match.status === 'finished' ? (
                  <p>
                    Score: {match.team_a_score} - {match.team_b_score} | Winner: {match.winner || 'N/A'}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p>Match schedule will be published soon.</p>
        )}
      </article>

      <article className="panel">
        <h2>Announcements</h2>
        {announcements.length ? (
          <div className="detail-page">
            {announcements.map((item) => (
              <div key={item.id} className="panel">
                <h3>{item.title}</h3>
                <p>{item.content}</p>
                <p className="detail-label">{formatDate(item.created_at)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No announcements yet.</p>
        )}
      </article>
    </section>
  );
};

export default TournamentDetails;
