import React from 'react';
import { Link } from 'react-router-dom';
import { getStoredUser, isAuthenticated, logout } from '../features/auth/auth.api';
import { getMyRegistrations, type MyRegistration } from '../features/tournaments/tournament.api';

const Profile: React.FC = () => {
  const stored = getStoredUser();
  const [name, setName] = React.useState(stored?.name || 'Guest User');
  const [email, setEmail] = React.useState(stored?.email || 'guest@example.com');
  const [editMode, setEditMode] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [registrations, setRegistrations] = React.useState<MyRegistration[]>([]);

  const user = {
    name,
    email,
    tournamentsParticipated: registrations.length,
    loggedIn: isAuthenticated(),
  };

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      if (!isAuthenticated()) return;
      try {
        const data = await getMyRegistrations();
        if (active) {
          setRegistrations(data);
        }
      } catch {
        if (active) {
          setRegistrations([]);
        }
      }
    };
    run();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = () => {
    const previous = getStoredUser() || {};
    localStorage.setItem('user', JSON.stringify({ ...previous, name, email }));
    setEditMode(false);
    setMessage('Profile updated locally.');
  };

  const handleLogout = async () => {
    try {
      await logout();
      setMessage('Logged out successfully.');
    } catch {
      setMessage('Logged out locally. Backend endpoint is unavailable.');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  };

  return (
    <div className="profile-page page-enter">
      <h1>My Profile</h1>
      <div className="profile-info panel">
        <p className="profile-status">{user.loggedIn ? 'Authenticated' : 'Guest Mode'}</p>
        <div className="profile-field">
          <label htmlFor="profile-name">Name</label>
          <input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!editMode}
          />
        </div>
        <div className="profile-field">
          <label htmlFor="profile-email">Email</label>
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!editMode}
          />
        </div>
        <p>
          <strong>Tournaments Participated:</strong> {user.tournamentsParticipated}
        </p>
        <div className="panel">
          <h3>My Registrations</h3>
          {registrations.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tournament</th>
                    <th>Game</th>
                    <th>Team</th>
                    <th>Points</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((item) => (
                    <tr key={item.registration_id}>
                      <td>{item.tournament_name}</td>
                      <td>{item.game}</td>
                      <td>{item.team_name}</td>
                      <td>{item.points}</td>
                      <td>{item.status}</td>
                      <td>
                        <Link to={`/tournaments/${item.tournament_id}`} className="table-link">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No registrations yet. Join tournaments to track progress.</p>
          )}
        </div>
        <div className="cta-row">
          {!editMode ? (
            <button className="btn btn-secondary" onClick={() => setEditMode(true)}>
              Edit Profile
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSave}>
              Save Changes
            </button>
          )}
          <button className="btn btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
        {message && <p className="message-text">{message}</p>}
      </div>
    </div>
  );
};

export default Profile;
