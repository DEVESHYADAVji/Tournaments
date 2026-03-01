import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { isAdmin } from '../features/auth/auth.api';

// Lazy load page components
const Home = lazy(() => import('../pages/Home'));
const Tournaments = lazy(() => import('../pages/Tournaments'));
const TournamentDetails = lazy(() => import('../pages/TournamentDetails'));
const Profile = lazy(() => import('../pages/Profile'));
const Admin = lazy(() => import('../pages/Admin'));

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <div className="loading-view">
    <div className="spinner" aria-hidden="true" />
    <p>Loading...</p>
  </div>
);

const AdminRoute: React.FC = () => {
  return isAdmin() ? <Admin /> : <Navigate to="/" replace />;
};

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/tournaments/:id" element={<TournamentDetails />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
