import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { getStoredUser, isAdmin, isAuthenticated } from '../features/auth/auth.api';
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
const AIRecommendations = lazy(() => import('../pages/AIRecommendations'));
const Payments = lazy(() => import('../pages/Payments'));
const Integrations = lazy(() => import('../pages/Integrations'));
const OAuthCallback = lazy(() => import('../pages/OAuthCallback'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/ResetPassword'));
const Admin = lazy(() => import('../pages/Admin'));
const ImageTextExtractor = lazy(() => import('../pages/ImageTextExtractor'));

const LoadingFallback: React.FC = () => <div className="loading-view"><div className="spinner" aria-hidden="true" /><p>Loading...</p></div>;
const UserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => isAuthenticated() && getStoredUser() ? <>{children}</> : <Navigate to="/" replace />;
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => isAdmin() ? <>{children}</> : <Navigate to="/" replace />;
const TournamentDetailsRoute: React.FC = () => { const { id } = useParams<{ id: string }>(); return <><TournamentDetails /><TournamentActions key={id} /><TournamentLiveFeed key={`live-${id}`} /></>; };

const AppRoutes: React.FC = () => <Suspense fallback={<LoadingFallback />}><Routes>
  <Route path="/" element={<Home />} /><Route path="/tournaments" element={<Tournaments />} />
  <Route path="/tournaments/:id" element={<TournamentDetailsRoute />} /><Route path="/tournaments/:id/bracket" element={<Bracket />} />
  <Route path="/teams" element={<UserRoute><Teams /></UserRoute>} /><Route path="/notifications" element={<UserRoute><Notifications /></UserRoute>} />
  <Route path="/payments" element={<UserRoute><Payments /></UserRoute>} /><Route path="/integrations" element={<UserRoute><Integrations /></UserRoute>} />
  <Route path="/ai/recommendations" element={<UserRoute><AIRecommendations /></UserRoute>} />
  <Route path="/oauth/callback" element={<OAuthCallback />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route path="/reset-password" element={<ResetPassword />} />
  <Route path="/admin/copilot" element={<AdminRoute><TournamentCopilot /></AdminRoute>} /><Route path="/profile" element={<UserRoute><Profile /></UserRoute>} />
  <Route path="/ocr" element={<UserRoute><ImageTextExtractor /></UserRoute>} /><Route path="/admin" element={<AdminRoute><Admin /><AdminProgression /></AdminRoute>} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes></Suspense>;
export default AppRoutes;
