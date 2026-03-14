import React from 'react';
import { Link } from 'react-router-dom';
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
    } catch (error: any) {
      setStatus(error?.response?.data?.detail || 'Failed to create tournament.');
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
    } catch (error: any) {
      setStatus(error?.response?.data?.detail || 'Failed to create match.');
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
    } catch (error: any) {
      setStatus(error?.response?.data?.detail || 'Failed to update result.');
    }
  };

  const handleAnnouncement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTournamentId) return;
    try {
      await createTournamentAnnouncement(selectedTournamentId, announcement);
      setStatus('Announcement published.');
      setAnnouncement({ title: '', content: '' });
    } catch (error: any) {
      setStatus(error?.response?.data?.detail || 'Failed to publish announcement.');
    }
  };

  return (
    <div className="admin-page page-enter">
      <section className="panel page-header" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=400&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', minHeight: '250px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(13, 13, 13, 0.93), rgba(26, 26, 26, 0.93))' }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p className="eyebrow" style={{ color: '#ffc107' }}>⚙️ Operations</p>
          <h1 style={{ color: '#ffffff' }}>Admin Panel</h1>
        </div>
        <select
          className="search-input"
          value={selectedTournamentId ?? ''}
          onChange={(e) => setSelectedTournamentId(Number(e.target.value))}
          style={{ position: 'relative', zIndex: 1, background: '#1a1a1a', border: '2px solid #c50000', color: '#ffffff' }}
        >
          {tournaments.map((item) => (
            <option key={item.id} value={item.id} style={{ background: '#1a1a1a', color: '#ffffff' }}>
              #{item.id} {item.name}
            </option>
          ))}
        </select>
      </section>

      <section className="panel" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=300&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', marginTop: '30px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(13, 13, 13, 0.92)' }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ color: '#ffc107', marginBottom: '20px' }}>➕ Create Tournament</h2>
          <form className="detail-page" onSubmit={handleCreate}>
            <input
              value={newTournament.name}
              placeholder="Tournament name"
              onChange={(e) => setNewTournament((prev) => ({ ...prev, name: e.target.value }))}
              required
              style={{ borderColor: '#c50000' }}
            />
            <input
              value={newTournament.game}
              placeholder="Game title"
              onChange={(e) => setNewTournament((prev) => ({ ...prev, game: e.target.value }))}
              required
              style={{ borderColor: '#c50000' }}
            />
            <input
              value={newTournament.format}
              placeholder="Format"
              onChange={(e) => setNewTournament((prev) => ({ ...prev, format: e.target.value }))}
              required
              style={{ borderColor: '#c50000' }}
            />
            <input
              value={newTournament.location}
              placeholder="Location"
              onChange={(e) => setNewTournament((prev) => ({ ...prev, location: e.target.value }))}
              style={{ borderColor: '#c50000' }}
            />
            <input
              value={newTournament.description}
              placeholder="Description"
              onChange={(e) => setNewTournament((prev) => ({ ...prev, description: e.target.value }))}
              style={{ borderColor: '#c50000' }}
            />
            <input
              type="datetime-local"
              value={newTournament.start_date}
              onChange={(e) => setNewTournament((prev) => ({ ...prev, start_date: e.target.value }))}
              style={{ borderColor: '#c50000' }}
            />
            <input
              type="datetime-local"
              value={newTournament.end_date}
              onChange={(e) => setNewTournament((prev) => ({ ...prev, end_date: e.target.value }))}
              style={{ borderColor: '#c50000' }}
            />
            <input
              type="number"
              value={newTournament.prize_pool}
              onChange={(e) => setNewTournament((prev) => ({ ...prev, prize_pool: Number(e.target.value) }))}
              placeholder="Prize pool"
              style={{ borderColor: '#c50000' }}
            />
            <input
              type="number"
              value={newTournament.max_teams}
              onChange={(e) => setNewTournament((prev) => ({ ...prev, max_teams: Number(e.target.value) }))}
              placeholder="Max teams"
              style={{ borderColor: '#c50000' }}
            />
            <select
              className="search-input"
              value={newTournament.status}
              onChange={(e) =>
                setNewTournament((prev) => ({
                  ...prev,
                  status: e.target.value as 'registration_open' | 'upcoming' | 'live' | 'completed',
                }))
              }
              style={{ borderColor: '#c50000', background: '#1a1a1a' }}
            >
              <option value="registration_open">Registration Open</option>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
            </select>
            <button className="btn btn-primary" type="submit" disabled={creating} style={{ background: 'linear-gradient(135deg, #c50000, #ffc107)' }}>
              {creating ? '⏳ Creating...' : '✅ Create Tournament'}
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
        <section className="panel admin-dashboard" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1551431009-381d36ac3a14?w=1200&h=300&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', marginTop: '30px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(13, 13, 13, 0.92)' }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ color: '#ffc107', marginBottom: '20px' }}>📊 Manage Tournaments</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr style={{ background: 'rgba(197, 0, 0, 0.3)' }}>
                    <th style={{ color: '#ffc107' }}>ID</th>
                    <th style={{ color: '#ffc107' }}>Name</th>
                    <th style={{ color: '#ffc107' }}>Date</th>
                    <th style={{ color: '#ffc107' }}>Location</th>
                    <th style={{ color: '#ffc107' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tournaments.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(197, 0, 0, 0.3)' }}>
                      <td style={{ color: '#ffffff' }}>#{item.id}</td>
                      <td style={{ color: '#ffffff' }}>{item.name}</td>
                      <td style={{ color: '#cccccc' }}>{item.start_date ? new Date(item.start_date).toLocaleDateString() : 'TBA'}</td>
                      <td style={{ color: '#cccccc' }}>{item.location || 'TBA'}</td>
                      <td>
                        <Link to={`/tournaments/${item.id}`} className="table-link" style={{ color: '#ffc107' }}>
                          Open 🔗
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

      <section className="admin-cards">
        <article className="panel" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1460647926306-322e0efc209c?w=400&h=300&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(13, 13, 13, 0.92)' }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{ color: '#ffc107', marginBottom: '15px' }}>⚔️ Schedule Match</h3>
            <form className="detail-page" onSubmit={handleCreateMatch}>
              <input
                value={newMatch.round_name}
                onChange={(e) => setNewMatch((prev) => ({ ...prev, round_name: e.target.value }))}
                placeholder="Round name"
                required
                style={{ borderColor: '#c50000' }}
              />
              <input
                value={newMatch.team_a}
                onChange={(e) => setNewMatch((prev) => ({ ...prev, team_a: e.target.value }))}
                placeholder="Team A"
                required
                style={{ borderColor: '#c50000' }}
              />
              <input
                value={newMatch.team_b}
                onChange={(e) => setNewMatch((prev) => ({ ...prev, team_b: e.target.value }))}
                placeholder="Team B"
                required
                style={{ borderColor: '#c50000' }}
              />
              <input
                type="datetime-local"
                value={newMatch.scheduled_at}
                onChange={(e) => setNewMatch((prev) => ({ ...prev, scheduled_at: e.target.value }))}
                style={{ borderColor: '#c50000' }}
              />
              <button className="btn btn-secondary" type="submit" style={{ background: 'linear-gradient(135deg, #c50000, #ffc107)' }}>
                ✅ Create Match
              </button>
            </form>
          </div>
        </article>
        <article className="panel" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1551431009-381d36ac3a14?w=400&h=300&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(13, 13, 13, 0.92)' }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{ color: '#ffc107', marginBottom: '15px' }}>📢 Publish Announcement</h3>
            <form className="detail-page" onSubmit={handleAnnouncement}>
              <input
                value={announcement.title}
                onChange={(e) => setAnnouncement((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Announcement title"
                required
                style={{ borderColor: '#c50000' }}
              />
              <input
                value={announcement.content}
                onChange={(e) => setAnnouncement((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Announcement content"
                required
                style={{ borderColor: '#c50000' }}
              />
              <button className="btn btn-secondary" type="submit" style={{ background: 'linear-gradient(135deg, #c50000, #ffc107)' }}>
                📤 Publish
              </button>
            </form>
          </div>
        </article>
      </section>

      <section className="panel" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=300&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', marginTop: '30px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(13, 13, 13, 0.92)' }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ color: '#ffc107', marginBottom: '20px' }}>🎯 Update Match Result</h2>
          <form className="detail-page" onSubmit={handleUpdateResult}>
            <select
              className="search-input"
              value={resultForm.match_id}
              onChange={(e) => setResultForm((prev) => ({ ...prev, match_id: e.target.value }))}
              required
              style={{ background: '#1a1a1a', border: '2px solid #c50000', color: '#ffffff' }}
            >
              <option value="" style={{ background: '#1a1a1a', color: '#ffffff' }}>Select match</option>
              {matches.map((match) => (
                <option key={match.id} value={match.id} style={{ background: '#1a1a1a', color: '#ffffff' }}>
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
              style={{ borderColor: '#c50000' }}
            />
            <input
              type="number"
              value={resultForm.team_b_score}
              onChange={(e) => setResultForm((prev) => ({ ...prev, team_b_score: Number(e.target.value) }))}
              placeholder="Team B score"
              min={0}
              required
              style={{ borderColor: '#c50000' }}
            />
            <input
              value={resultForm.winner}
              onChange={(e) => setResultForm((prev) => ({ ...prev, winner: e.target.value }))}
              placeholder="Winner team (optional)"
              style={{ borderColor: '#c50000' }}
            />
            <button className="btn btn-primary" type="submit" style={{ background: 'linear-gradient(135deg, #c50000, #ffc107)' }}>
              ✅ Update Result
            </button>
          </form>
        </div>
      </section>

      {status && (
        <div className="panel" style={{ marginTop: '30px', backgroundImage: 'url(https://images.unsplash.com/photo-1516321318423-f06c6e504b00?w=1200&h=200&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(13, 13, 13, 0.92)' }}></div>
          <p className="message-text" style={{ position: 'relative', zIndex: 1, color: '#ffc107', fontWeight: '600' }}>
            {status.includes('success') || status.includes('published') || status.includes('updated') || status.includes('created') ? '✅' : '⚠️'} {status}
          </p>
        </div>
      )}
    </div>
  );
};

export default Admin;
