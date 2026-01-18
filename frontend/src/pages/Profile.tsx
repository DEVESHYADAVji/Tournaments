import React from 'react';

const Profile: React.FC = () => {
  const user = {
    name: 'John Doe',
    email: 'john@example.com',
    tournaments_participated: 5,
  };

  return (
    <div className="profile-page">
      <h1>My Profile</h1>
      <div className="profile-info">
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Tournaments Participated:</strong> {user.tournaments_participated}</p>
        <button>Edit Profile</button>
        <button>Logout</button>
      </div>
    </div>
  );
};

export default Profile;
