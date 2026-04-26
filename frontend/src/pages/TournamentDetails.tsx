import React from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
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

interface ApiErrorShape {
  detail?: string;
}

const TournamentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = React.useState<'overview' | 'standings' | 'matches' | 'announcements'>('overview');
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
    } catch (error: unknown) {
      setJoinMessage((error as AxiosError<ApiErrorShape>)?.response?.data?.detail || 'Unable to join tournament.');
    } finally {
      setJoining(false);
    }
  };

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
      <section className="section-card page-enter">
        <div className="section-card-inner">
          <h1>Tournament not found</h1>
          <p>The requested tournament does not exist.</p>
          <Link to="/tournaments" className="btn btn-secondary">
            Back to tournaments
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-stack page-enter">
      <article className="hero-surface">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="inline-actions">
              <span className="section-label">Tournament #{tournament.id}</span>
              <span className={`status-pill status-${tournament.status}`}>{tournament.status}</span>
              <span className="small-pill">{tournament.game}</span>
            </div>
            <h1 className="page-title">{tournament.name}</h1>
            <p>{tournament.description || 'No description is available yet.'}</p>

            <div className="detail-grid">
              <div>
                <div className="meta-label">Date</div>
                <div className="meta-value">{formatDate(tournament.start_date)}</div>
              </div>
              <div>
                <div className="meta-label">Location</div>
                <div className="meta-value">{tournament.location || 'TBA'}</div>
              </div>
              <div>
                <div className="meta-label">Prize pool</div>
                <div className="meta-value">${Number(tournament.prize_pool || 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="meta-label">Format</div>
                <div className="meta-value">{tournament.format}</div>
              </div>
              <div>
                <div className="meta-label">Participants</div>
                <div className="meta-value">{tournament.participants_count}/{tournament.max_teams}</div>
              </div>
              <div>
                <div className="meta-label">Matches</div>
                <div className="meta-value">{tournament.matches_count}</div>
              </div>
            </div>

            <div className="cta-row">
              <button
                className="btn btn-primary"
                onClick={handleJoin}
                disabled={joining || tournament.is_registered}
              >
                {tournament.is_registered ? 'Registered' : joining ? 'Joining...' : 'Join tournament'}
              </button>
              <Link to="/tournaments" className="btn btn-secondary">
                Back to tournaments
              </Link>
            </div>
            {joinMessage ? <p className="message-text">{joinMessage}</p> : null}
          </div>
        </div>
      </article>

      <div className="detail-shell">
        <div className="details-main">
          <section className="section-card">
            <div className="section-card-inner">
              <div className="inline-actions">
                <button type="button" className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                  Overview
                </button>
                <button type="button" className={`tab-button ${activeTab === 'standings' ? 'active' : ''}`} onClick={() => setActiveTab('standings')}>
                  Standings
                </button>
                <button type="button" className={`tab-button ${activeTab === 'matches' ? 'active' : ''}`} onClick={() => setActiveTab('matches')}>
                  Matches
                </button>
                <button type="button" className={`tab-button ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveTab('announcements')}>
                  Announcements
                </button>
              </div>
            </div>
          </section>

          {activeTab === 'overview' ? (
            <section className="section-card">
              <div className="section-card-inner overview-grid">
                <div className="info-card">
                  <p className="section-label">Overview</p>
                  <h3>What this event looks like</h3>
                  <p>
                    {tournament.description ||
                      'This tournament is ready for registrations, standings, scheduling, and announcements.'}
                  </p>
                </div>
                <div className="info-card">
                  <p className="section-label">Readiness</p>
                  <h3>Quick view</h3>
                  <div className="inline-actions">
                    <span className="small-pill">{tournament.format}</span>
                    <span className="small-pill">{tournament.location || 'Location TBA'}</span>
                    <span className="small-pill">{tournament.game}</span>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === 'standings' ? (
            <section className="section-card">
              <div className="section-card-inner">
                <div className="section-header">
                  <div>
                    <p className="section-label">Leaderboard</p>
                    <h2>Current standings</h2>
                  </div>
                </div>
                {standings.length ? (
                  <div className="table-wrap">
                    <table className="standings-table">
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
                  <div className="empty-state">
                    <h3>No standings yet</h3>
                    <p>Registrations and match results will populate this table.</p>
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {activeTab === 'matches' ? (
            <section className="section-card">
              <div className="section-card-inner">
                <div className="section-header">
                  <div>
                    <p className="section-label">Schedule</p>
                    <h2>Match list</h2>
                  </div>
                </div>
                {matches.length ? (
                  <div className="schedule-list">
                    {matches.map((match) => (
                      <article key={match.id} className="match-card">
                        <div className="inline-actions">
                          <span className="small-pill">{match.round_name}</span>
                          <span className={`status-pill status-${match.status === 'finished' ? 'completed' : tournament.status}`}>{match.status}</span>
                        </div>
                        <div className="inline-actions">
                          <span className="meta-value">{match.team_a}</span>
                          <span className="small-pill">vs</span>
                          <span className="meta-value">{match.team_b}</span>
                        </div>
                        <p>Scheduled: {formatDate(match.scheduled_at)}</p>
                        {match.status === 'finished' ? (
                          <p className="message-success">
                            Score {match.team_a_score} - {match.team_b_score} | Winner: {match.winner || 'N/A'}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <h3>No matches scheduled</h3>
                    <p>Admins can publish matchups from the admin dashboard.</p>
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {activeTab === 'announcements' ? (
            <section className="section-card">
              <div className="section-card-inner">
                <div className="section-header">
                  <div>
                    <p className="section-label">Updates</p>
                    <h2>Announcements</h2>
                  </div>
                </div>
                {announcements.length ? (
                  <div className="announcement-list">
                    {announcements.map((item) => (
                      <article key={item.id} className="announcement-card">
                        <h3>{item.title}</h3>
                        <p>{item.content}</p>
                        <span className="meta-label">{formatDate(item.created_at)}</span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <h3>No announcements yet</h3>
                    <p>Tournament updates will appear here when admins publish them.</p>
                  </div>
                )}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="details-sidebar">
          <div className="side-stat-card">
            <span className="meta-label">Registration</span>
            <span className="meta-value">{tournament.participants_count}/{tournament.max_teams} slots filled</span>
          </div>
          <div className="side-stat-card">
            <span className="meta-label">Current status</span>
            <span className={`status-pill status-${tournament.status}`}>{tournament.status}</span>
          </div>
          <div className="side-stat-card">
            <span className="meta-label">Need action?</span>
            <p>Players can join here. Admins can manage brackets and announcements from the admin panel.</p>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default TournamentDetails;
