import React from 'react';
import { getStoredUser, isAuthenticated, logout } from '../features/auth/auth.api';

const Profile: React.FC = () => {
  const stored = getStoredUser();
  const [name, setName] = React.useState(stored?.name || 'Guest User');
  const [email, setEmail] = React.useState(stored?.email || 'guest@example.com');
  const [editMode, setEditMode] = React.useState(false);
  const [message, setMessage] = React.useState('');

  const user = {
    name,
    email,
    tournamentsParticipated: 5,
    loggedIn: isAuthenticated(),
  };

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
