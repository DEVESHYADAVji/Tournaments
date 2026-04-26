import React from 'react';
import { Link } from 'react-router-dom';
import ProfileIconSelector from '../compoments/ProfileIconSelector/ProfileIconSelector';
import { getProfileIcon } from '../config/profileIcons';
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
    <div className="section-stack page-enter">
      <section className="hero-surface">
        <div className="hero-inner">
          <p className="section-label">Profile</p>
          <h1 className="page-title">Player identity and registrations</h1>
          <p>Keep account details simple, editable, and easy to follow for new developers reading the codebase.</p>
        </div>
      </section>

      <section className="profile-layout">
        <article className="tool-card profile-card">
          <div className="profile-avatar-large" dangerouslySetInnerHTML={{ __html: getProfileIcon(profileIcon) }} />
          <span className="profile-status">{user.loggedIn ? 'Authenticated' : 'Guest mode'}</span>

          <div className="field">
            <label className="field-label" htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!editMode}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="profile-email">Email</label>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!editMode}
            />
          </div>

          {editMode ? (
            <ProfileIconSelector selectedIcon={profileIcon} onIconSelect={setProfileIcon} />
          ) : null}

          <div className="side-stat-card">
            <span className="meta-label">Registrations</span>
            <span className="meta-value">{user.tournamentsParticipated}</span>
          </div>

          <div className="cta-row">
            {!editMode ? (
              <button className="btn btn-secondary" onClick={() => setEditMode(true)}>
                Edit profile
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleSave}>
                Save changes
              </button>
            )}
            <button className="btn btn-ghost" onClick={handleLogout}>
              Logout
            </button>
          </div>
          {message ? <p className="message-text">{message}</p> : null}
        </article>

        <article className="section-card">
          <div className="section-card-inner">
            <div className="section-header">
              <div>
                <p className="section-label">Entries</p>
                <h2>My registrations</h2>
              </div>
            </div>
            {registrations.length ? (
              <div className="table-wrap">
                <table className="data-table">
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
              <div className="empty-state">
                <h3>No registrations yet</h3>
                <p>Join tournaments to track your progress here.</p>
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
};

export default Profile;
