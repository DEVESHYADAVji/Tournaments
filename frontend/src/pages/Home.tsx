import React from 'react';
import { Link } from 'react-router-dom';
import Carousel from '../compoments/Carousel/Carousel';
import TournamentCard from '../compoments/TournamentCard/TournamentCard';
import { getStoredUser } from '../features/auth/auth.api';
import { getAllTournaments } from '../features/tournaments/tournament.api';

interface CarouselSlide {
  id: string;
  title: string;
  description: string;
  image: string;
  link?: string;
}

interface Tournament {
  id: number;
  name: string;
  game_name?: string;
  description?: string;
  banner_image?: string;
  status?: string;
  prize_pool?: number;
  start_date?: string;
  end_date?: string;
}

const Home: React.FC = () => {
  const [tournaments, setTournaments] = React.useState<Tournament[]>([]);
  const [count, setCount] = React.useState<number>(0);
  const [liveCount, setLiveCount] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(true);
  const user = getStoredUser();

  // Sample carousel slides
  const carouselSlides: CarouselSlide[] = [
    {
      id: '1',
      title: 'Championship Series 2026',
      description: 'Be part of the biggest tournament of the year. Compete for glory and prizes!',
      image: 'https://via.placeholder.com/1200x400?text=Championship+Series+2026',
      link: '/tournaments'
    },
    {
      id: '2',
      title: 'Weekly Grind Tournament',
      description: 'Join us every week for exciting matches and instant rewards.',
      image: 'https://via.placeholder.com/1200x400?text=Weekly+Grind+Tournament',
      link: '/tournaments'
    },
    {
      id: '3',
      title: 'New Players Welcome',
      description: 'First time competing? Join our beginner-friendly tournaments and learn the ropes.',
      image: 'https://via.placeholder.com/1200x400?text=New+Players+Welcome',
      link: '/tournaments'
    }
  ];

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    getAllTournaments().then((items) => {
      if (active) {
        setTournaments(items);
        setCount(items.length);
        setLiveCount(items.filter((item) => item.status === 'live').length);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const upcomingTournaments = tournaments.slice(0, 8);

  return (
    <div className="home-page page-enter">
      {/* Featured Carousel */}
      <Carousel slides={carouselSlides} autoPlay={true} autoPlayInterval={6000} />

      {/* Upcoming Tournaments Section */}
      <div className="tournament-cards-section">
        <h2 className="tournament-section-title">🏆 Upcoming Tournaments</h2>
        {loading ? (
          <div className="loading-view">
            <div className="spinner"></div>
            <p>Loading tournaments...</p>
          </div>
        ) : upcomingTournaments.length > 0 ? (
          <div className="tournament-grid">
            {upcomingTournaments.map((tournament) => (
              <TournamentCard 
                key={tournament.id} 
                tournament={tournament}
              />
            ))}
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#95a7c7' }}>
            <p>No tournaments available at the moment. Check back soon!</p>
          </div>
        )}
      </div>

      {/* Stats Section */}
      <section style={{ marginTop: '40px' }} className="stats-grid stats-grid-2col">
        <article className="stat-card panel">
          <p className="stat-label">Live Tournaments</p>
          <p className="stat-value">{liveCount}</p>
        </article>
        <article className="stat-card panel">
          <p className="stat-label">Total Tournaments</p>
          <p className="stat-value">{count}</p>
        </article>
      </section>

      {/* Quick Actions Section */}
      <section className="quick-links panel" style={{ marginTop: '30px' }}>
        <h2>Quick Actions</h2>
        <div className="quick-links-grid">
          <Link to="/profile" className="quick-link-card">
            👤 Manage Your Profile
          </Link>
          <Link to="/tournaments" className="quick-link-card">
            🎮 Explore All Tournaments
          </Link>
          <Link to="/ocr" className="quick-link-card">
            📄 Extract Text from Images
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
