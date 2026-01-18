import React from 'react';

const Admin: React.FC = () => {
  return (
    <div className="admin-page">
      <h1>Admin Panel</h1>
      <div className="admin-dashboard">
        <section>
          <h2>Manage Tournaments</h2>
          <button>Create Tournament</button>
          <button>View All Tournaments</button>
        </section>
        <section>
          <h2>Manage Users</h2>
          <button>View Users</button>
          <button>Manage Permissions</button>
        </section>
        <section>
          <h2>System Settings</h2>
          <button>Configure Settings</button>
          <button>View Logs</button>
        </section>
      </div>
    </div>
  );
};

export default Admin;
