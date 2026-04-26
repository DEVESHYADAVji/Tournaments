import React from 'react';
import { Link } from 'react-router-dom';
import type { AxiosError } from 'axios';
import {
  createTournament,
  createTournamentAnnouncement,
  createTournamentMatch,
  getAllTournaments,
  getTournamentMatches,
  updateMatchResult,
  type Match,
  type Tournament,
} from '../features/tournaments/tournament.api';

interface ApiErrorShape {
  detail?: string;
}

const Admin: React.FC = () => {
  const [tournaments, setTournaments] = React.useState<Tournament[]>([]);
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState('');
  const [selectedTournamentId, setSelectedTournamentId] = React.useState<number | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [newTournament, setNewTournament] = React.useState({
    name: '',
    game: '',
    format: 'Single Elimination',
    location: '',
    description: '',
    start_date: '',
    end_date: '',
    prize_pool: 0,
    max_teams: 16,
    status: 'registration_open' as 'registration_open' | 'upcoming' | 'live' | 'completed',
  });
  const [newMatch, setNewMatch] = React.useState({
    round_name: 'Round 1',
    team_a: '',
    team_b: '',
    scheduled_at: '',
  });
  const [resultForm, setResultForm] = React.useState({
    match_id: '',
    team_a_score: 0,
    team_b_score: 0,
    winner: '',
  });
  const [announcement, setAnnouncement] = React.useState({ title: '', content: '' });

  const loadTournaments = React.useCallback(async () => {
    const data = await getAllTournaments();
    setTournaments(data);
    if (!selectedTournamentId && data.length) {
      setSelectedTournamentId(data[0].id);
    }
  }, [selectedTournamentId]);

  const loadMatches = React.useCallback(async () => {
    if (!selectedTournamentId) {
      setMatches([]);
      return;
    }
    const data = await getTournamentMatches(selectedTournamentId);
    setMatches(data);
  }, [selectedTournamentId]);

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) {
        await loadTournaments();
        setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [loadTournaments]);

  React.useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setStatus('');
    try {
      const created = await createTournament({
        ...newTournament,
        start_date: newTournament.start_date || undefined,
        end_date: newTournament.end_date || undefined,
      });
      setStatus(`Tournament "${created.name}" created.`);
      setNewTournament({
        name: '',
        game: '',
        format: 'Single Elimination',
        location: '',
        description: '',
        start_date: '',
        end_date: '',
        prize_pool: 0,
        max_teams: 16,
        status: 'registration_open',
      });
      await loadTournaments();
    } catch (error: unknown) {
      setStatus((error as AxiosError<ApiErrorShape>)?.response?.data?.detail || 'Failed to create tournament.');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateMatch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTournamentId) return;
    try {
      await createTournamentMatch(selectedTournamentId, {
        round_name: newMatch.round_name,
        team_a: newMatch.team_a,
        team_b: newMatch.team_b,
        scheduled_at: newMatch.scheduled_at || undefined,
      });
      setStatus('Match scheduled successfully.');
      setNewMatch({ round_name: 'Round 1', team_a: '', team_b: '', scheduled_at: '' });
      await loadMatches();
    } catch (error: unknown) {
      setStatus((error as AxiosError<ApiErrorShape>)?.response?.data?.detail || 'Failed to create match.');
    }
  };

  const handleUpdateResult = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTournamentId || !resultForm.match_id) return;
    try {
      await updateMatchResult(selectedTournamentId, Number(resultForm.match_id), {
        team_a_score: Number(resultForm.team_a_score),
        team_b_score: Number(resultForm.team_b_score),
        winner: resultForm.winner || undefined,
      });
      setStatus('Match result updated.');
      await loadMatches();
    } catch (error: unknown) {
      setStatus((error as AxiosError<ApiErrorShape>)?.response?.data?.detail || 'Failed to update result.');
    }
  };

  const handleAnnouncement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTournamentId) return;
    try {
      await createTournamentAnnouncement(selectedTournamentId, announcement);
      setStatus('Announcement published.');
      setAnnouncement({ title: '', content: '' });
    } catch (error: unknown) {
      setStatus((error as AxiosError<ApiErrorShape>)?.response?.data?.detail || 'Failed to publish announcement.');
    }
  };

  return (
    <div className="section-stack page-enter">
      <section className="hero-surface">
        <div className="hero-inner page-header-grid">
          <div>
            <p className="section-label">Operations</p>
            <h1 className="page-title">Admin control room</h1>
            <p>Create events, schedule matches, publish announcements, and update match results from one page.</p>
          </div>
          <div className="filter-card">
            <h3>Active tournament</h3>
            <select
              value={selectedTournamentId ?? ''}
              onChange={(e) => setSelectedTournamentId(Number(e.target.value))}
            >
              {tournaments.map((item) => (
                <option key={item.id} value={item.id}>
                  #{item.id} {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="section-card">
        <div className="section-card-inner">
          <div className="section-header">
            <div>
              <p className="section-label">Setup</p>
              <h2>Create tournament</h2>
            </div>
          </div>
          <form className="form-grid" onSubmit={handleCreate}>
            <input
              value={newTournament.name}
              placeholder="Tournament name"
              onChange={(e) => setNewTournament((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <input
              value={newTournament.game}
              placeholder="Game title"
              onChange={(e) => setNewTournament((prev) => ({ ...prev, game: e.target.value }))}
              required
            />
            <input
              value={newTournament.format}
              placeholder="Format"
              onChange={(e) => setNewTournament((prev) => ({ ...prev, format: e.target.value }))}
              required
            />
            <input
              value={newTournament.location}
              placeholder="Location"
              onChange={(e) => setNewTournament((prev) => ({ ...prev, location: e.target.value }))}
            />
            <textarea
              value={newTournament.description}
              placeholder="Description"
              onChange={(e) => setNewTournament((prev) => ({ ...prev, description: e.target.value }))}
            />
            <input
              type="datetime-local"
              value={newTournament.start_date}
              onChange={(e) => setNewTournament((prev) => ({ ...prev, start_date: e.target.value }))}
            />
            <input
              type="datetime-local"
              value={newTournament.end_date}
              onChange={(e) => setNewTournament((prev) => ({ ...prev, end_date: e.target.value }))}
            />
            <input
              type="number"
              value={newTournament.prize_pool}
              onChange={(e) => setNewTournament((prev) => ({ ...prev, prize_pool: Number(e.target.value) }))}
              placeholder="Prize pool"
            />
            <input
              type="number"
              value={newTournament.max_teams}
              onChange={(e) => setNewTournament((prev) => ({ ...prev, max_teams: Number(e.target.value) }))}
              placeholder="Max teams"
            />
            <select
              value={newTournament.status}
              onChange={(e) =>
                setNewTournament((prev) => ({
                  ...prev,
                  status: e.target.value as 'registration_open' | 'upcoming' | 'live' | 'completed',
                }))
              }
            >
              <option value="registration_open">Registration Open</option>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
            </select>
            <button className="btn btn-primary" type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create tournament'}
            </button>
          </form>
        </div>
      </section>

      {loading ? (
        <div className="loading-view">
          <div className="spinner" aria-hidden="true" />
          <p>Loading admin data...</p>
        </div>
      ) : (
        <section className="section-card">
          <div className="section-card-inner">
            <div className="section-header">
              <div>
                <p className="section-label">Directory</p>
                <h2>Manage tournaments</h2>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tournaments.map((item) => (
                    <tr key={item.id}>
                      <td>#{item.id}</td>
                      <td>{item.name}</td>
                      <td>{item.start_date ? new Date(item.start_date).toLocaleDateString() : 'TBA'}</td>
                      <td>{item.location || 'TBA'}</td>
                      <td>
                        <Link to={`/tournaments/${item.id}`} className="table-link">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="admin-grid">
        <article className="tool-card">
          <h3>Schedule match</h3>
          <form className="form-stack" onSubmit={handleCreateMatch}>
            <input
              value={newMatch.round_name}
              onChange={(e) => setNewMatch((prev) => ({ ...prev, round_name: e.target.value }))}
              placeholder="Round name"
              required
            />
            <input
              value={newMatch.team_a}
              onChange={(e) => setNewMatch((prev) => ({ ...prev, team_a: e.target.value }))}
              placeholder="Team A"
              required
            />
            <input
              value={newMatch.team_b}
              onChange={(e) => setNewMatch((prev) => ({ ...prev, team_b: e.target.value }))}
              placeholder="Team B"
              required
            />
            <input
              type="datetime-local"
              value={newMatch.scheduled_at}
              onChange={(e) => setNewMatch((prev) => ({ ...prev, scheduled_at: e.target.value }))}
            />
            <button className="btn btn-secondary" type="submit">
              Create match
            </button>
          </form>
        </article>

        <article className="tool-card">
          <h3>Publish announcement</h3>
          <form className="form-stack" onSubmit={handleAnnouncement}>
            <input
              value={announcement.title}
              onChange={(e) => setAnnouncement((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Announcement title"
              required
            />
            <textarea
              value={announcement.content}
              onChange={(e) => setAnnouncement((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Announcement content"
              required
            />
            <button className="btn btn-secondary" type="submit">
              Publish
            </button>
          </form>
        </article>
      </section>

      <section className="section-card">
        <div className="section-card-inner">
          <div className="section-header">
            <div>
              <p className="section-label">Results</p>
              <h2>Update match result</h2>
            </div>
          </div>
          <form className="form-grid" onSubmit={handleUpdateResult}>
            <select
              value={resultForm.match_id}
              onChange={(e) => setResultForm((prev) => ({ ...prev, match_id: e.target.value }))}
              required
            >
              <option value="">Select match</option>
              {matches.map((match) => (
                <option key={match.id} value={match.id}>
                  #{match.id} {match.team_a} vs {match.team_b} ({match.round_name})
                </option>
              ))}
            </select>
            <input
              type="number"
              value={resultForm.team_a_score}
              onChange={(e) => setResultForm((prev) => ({ ...prev, team_a_score: Number(e.target.value) }))}
              placeholder="Team A score"
              min={0}
              required
            />
            <input
              type="number"
              value={resultForm.team_b_score}
              onChange={(e) => setResultForm((prev) => ({ ...prev, team_b_score: Number(e.target.value) }))}
              placeholder="Team B score"
              min={0}
              required
            />
            <input
              value={resultForm.winner}
              onChange={(e) => setResultForm((prev) => ({ ...prev, winner: e.target.value }))}
              placeholder="Winner team (optional)"
            />
            <button className="btn btn-primary" type="submit">
              Update result
            </button>
          </form>
        </div>
      </section>

      {status ? (
        <div className="section-card">
          <div className="section-card-inner">
            <p className={`message-text ${status.toLowerCase().includes('failed') ? 'message-error' : 'message-success'}`}>
              {status}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Admin;
