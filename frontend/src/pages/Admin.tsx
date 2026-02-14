import React from 'react';
import { Link } from 'react-router-dom';
import { getAllTournaments, type Tournament } from '../features/tournaments/tournament.api';

const Admin: React.FC = () => {
  const [tournaments, setTournaments] = React.useState<Tournament[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState('');

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      const data = await getAllTournaments();
      if (active) {
        setTournaments(data);
        setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, []);

  const handleCreate = () => {
    setStatus('Create action triggered. Connect this to a backend POST endpoint.');
  };

  return (
    <div className="admin-page page-enter">
      <section className="panel page-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Admin Panel</h1>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          Create Tournament
        </button>
      </section>

      {loading ? (
        <div className="loading-view">
          <div className="spinner" aria-hidden="true" />
          <p>Loading admin data...</p>
        </div>
      ) : (
        <section className="panel admin-dashboard">
          <h2>Manage Tournaments</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
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
                    <td>{item.id}</td>
                    <td>{item.name}</td>
                    <td>{item.date}</td>
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
        </section>
      )}

      <section className="admin-cards">
        <article className="panel">
          <h3>Users</h3>
          <p>Review participants and moderation tasks.</p>
          <button className="btn btn-secondary" onClick={() => setStatus('User management opened.')}>
            Manage Users
          </button>
        </article>
        <article className="panel">
          <h3>System Settings</h3>
          <p>Adjust environment configuration and audit logs.</p>
          <button className="btn btn-secondary" onClick={() => setStatus('Settings opened.')}>
            Open Settings
          </button>
        </article>
      </section>

      {status && (
        <div className="panel">
          <p className="message-text">{status}</p>
        </div>
      )}
    </div>
  );
};

export default Admin;
