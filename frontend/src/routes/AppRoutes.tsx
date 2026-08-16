import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { isAdmin } from '../features/auth/auth.api';
import TournamentActions from '../compoments/TournamentActions/TournamentActions';
import TournamentLiveFeed from '../compoments/TournamentLiveFeed/TournamentLiveFeed';
import AdminProgression from '../compoments/AdminProgression/AdminProgression';

const Home = lazy(() => import('../pages/Home'));
const Tournaments = lazy(() => import('../pages/Tournaments'));
const TournamentDetails = lazy(() => import('../pages/TournamentDetails'));
const Bracket = lazy(() => import('../pages/Bracket'));
const Profile = lazy(() => import('../pages/Profile'));
const Teams = lazy(() => import('../pages/Teams'));
const Notifications = lazy(() => import('../pages/Notifications'));
const TournamentCopilot = lazy(() => import('../pages/TournamentCopilot'));
const Payments = lazy(() => import('../pages/Payments'));
const Admin = lazy(() => import('../pages/Admin'));
const ImageTextExtractor = lazy(() => import('../pages/ImageTextExtractor'));

const LoadingFallback: React.FC = () => (
  <div className="loading-view">
    <div className="spinner" aria-hidden="true" />
    <p>Loading...</p>
  </div>
);

const AdminRoute: React.FC = () => (
  isAdmin() ? <><Admin /><AdminProgression /></> : <Navigate to="/" replace />
);

const TournamentDetailsRoute: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <><TournamentDetails /><TournamentActions key={id} /><TournamentLiveFeed key={`live-${id}`} /></>;
};

const AppRoutes: React.FC = () => (
  <Suspense fallback={<LoadingFallback />}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tournaments" element={<Tournaments />} />
      <Route path="/tournaments/:id" element={<TournamentDetailsRoute />} />
      <Route path="/tournaments/:id/bracket" element={<Bracket />} />
      <Route path="/teams" element={<Teams />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/payments" element={<Payments />} />
      <Route path="/admin/copilot" element={<TournamentCopilot />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/ocr" element={<ImageTextExtractor />} />
      <Route path="/admin" element={<AdminRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
