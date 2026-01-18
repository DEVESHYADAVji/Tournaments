import React from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
	return (
		<div style={{ maxWidth: 1100, margin: '0 auto', padding: 20 }}>
			<header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<h1>Admin Dashboard</h1>
				<div>
					<input placeholder="Search..." style={{ padding: '6px 8px' }} />
				</div>
			</header>

			<main style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 20 }}>
				<section style={{ background: '#fff', padding: 16, borderRadius: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
					<h2>Tournaments</h2>
					<p>Overview and management actions for tournaments.</p>
					<div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
						<button>Create Tournament</button>
						<button>Import</button>
						<button>Export</button>
					</div>

					<div style={{ marginTop: 16 }}>
						<table style={{ width: '100%', borderCollapse: 'collapse' }}>
							<thead>
								<tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
									<th style={{ padding: 8 }}>Name</th>
									<th style={{ padding: 8 }}>Date</th>
									<th style={{ padding: 8 }}>Status</th>
									<th style={{ padding: 8 }}>Actions</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td style={{ padding: 8 }}>Chess Championship</td>
									<td style={{ padding: 8 }}>2026-03-12</td>
									<td style={{ padding: 8 }}>Scheduled</td>
									<td style={{ padding: 8 }}><Link to="/tournaments/1">Manage</Link></td>
								</tr>
								<tr>
									<td style={{ padding: 8 }}>Coding Challenge</td>
									<td style={{ padding: 8 }}>2026-04-05</td>
									<td style={{ padding: 8 }}>Open</td>
									<td style={{ padding: 8 }}><Link to="/tournaments/2">Manage</Link></td>
								</tr>
							</tbody>
						</table>
					</div>
				</section>

				<aside style={{ background: '#fff', padding: 16, borderRadius: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
					<h2>Users</h2>
					<p>Quick user actions and summaries.</p>
					<div style={{ marginTop: 12 }}>
						<button style={{ display: 'block', width: '100%', marginBottom: 8 }}>View Users</button>
						<button style={{ display: 'block', width: '100%', marginBottom: 8 }}>Invite User</button>
						<button style={{ display: 'block', width: '100%' }}>Roles & Permissions</button>
					</div>

					<div style={{ marginTop: 16 }}>
						<h4>Recent Signups</h4>
						<ul style={{ paddingLeft: 18 }}>
							<li>alice@example.com</li>
							<li>bob@example.com</li>
						</ul>
					</div>
				</aside>
			</main>
		</div>
	);
};

export default AdminDashboard;

