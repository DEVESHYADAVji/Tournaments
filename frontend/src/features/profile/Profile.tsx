import React from 'react';

interface User {
	id: string;
	name: string;
	email: string;
	joinedAt: string;
	tournamentsParticipated: number;
	bio?: string;
}

const mockUser: User = {
	id: 'user_123',
	name: 'John Doe',
	email: 'john.doe@example.com',
	joinedAt: '2024-08-01',
	tournamentsParticipated: 7,
	bio: 'Enthusiastic tournament participant and organizer.',
};

const Profile: React.FC = () => {
	const user = mockUser;

	return (
		<div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
			<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
				<div style={{ width: 96, height: 96, borderRadius: '50%', background: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
					{user.name.split(' ').map(n => n[0]).join('')}
				</div>
				<div>
					<h1 style={{ margin: 0 }}>{user.name}</h1>
					<p style={{ margin: 2, color: '#666' }}>{user.email}</p>
					<p style={{ margin: 2, color: '#666' }}>Joined: {user.joinedAt}</p>
				</div>
			</div>

			<section style={{ marginTop: 20 }}>
				<h3>About</h3>
				<p>{user.bio}</p>
			</section>

			<section style={{ marginTop: 16 }}>
				<h3>Stats</h3>
				<div style={{ display: 'flex', gap: 24 }}>
					<div>
						<div style={{ fontSize: 20, fontWeight: 600 }}>{user.tournamentsParticipated}</div>
						<div style={{ color: '#666' }}>Tournaments</div>
					</div>
					<div>
						<div style={{ fontSize: 20, fontWeight: 600 }}>—</div>
						<div style={{ color: '#666' }}>Wins</div>
					</div>
				</div>
			</section>

			<section style={{ marginTop: 20 }}>
				<button style={{ marginRight: 8 }}>Edit Profile</button>
				<button>View My Tournaments</button>
			</section>
		</div>
	);
};

export default Profile;

