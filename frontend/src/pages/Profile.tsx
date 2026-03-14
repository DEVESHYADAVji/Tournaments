import React from 'react';
import { Link } from 'react-router-dom';
import ProfileIconSelector from '../compoments/ProfileIconSelector/ProfileIconSelector';
import { getStoredUser, isAuthenticated, logout } from '../features/auth/auth.api';
import { getMyRegistrations, type MyRegistration } from '../features/tournaments/tournament.api';

const Profile: React.FC = () => {
  const stored = getStoredUser();
  const [name, setName] = React.useState(stored?.name || 'Guest User');
  const [email, setEmail] = React.useState(stored?.email || 'guest@example.com');
  const [profileIcon, setProfileIcon] = React.useState(stored?.profile_icon || 1);
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
    localStorage.setItem('user', JSON.stringify({ ...previous, name, email, profile_icon: profileIcon }));
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
      <div className="profile-info panel" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1200&h=400&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', minHeight: '250px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(13, 13, 13, 0.95), rgba(26, 26, 26, 0.95))' }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p className="profile-status" style={{ fontSize: '16px', color: '#ffc107', fontWeight: '600' }}>{user.loggedIn ? '✅ Authenticated' : '⚠️ Guest Mode'}</p>
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
          {editMode && (
            <ProfileIconSelector 
              selectedIcon={profileIcon}
              onIconSelect={setProfileIcon}
            />
          )}
          <p style={{ color: '#cccccc', marginTop: '15px' }}>
            <strong>🏆 Tournaments Participated:</strong> {user.tournamentsParticipated}
          </p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '30px', backgroundImage: 'url(https://images.unsplash.com/photo-1460647926306-322e0efc209c?w=1200&h=300&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(13, 13, 13, 0.92)' }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3 style={{ color: '#ffc107', marginBottom: '20px' }}>📊 My Registrations</h3>
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
            <p style={{ color: '#95a7c7' }}>No registrations yet. Join tournaments to track progress.</p>
          )}
        </div>
      </div>

      <div className="cta-row" style={{ marginTop: '20px' }}>
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
  );
};

export default Profile;
