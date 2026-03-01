import React from 'react';
import { BrowserRouter, NavLink } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import {
  getStoredUser,
  isAuthenticated,
  loginAsAdmin,
  loginAsUser,
  logout,
  register,
} from './features/auth/auth.api';

const App: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [mode, setMode] = React.useState<'login' | 'register'>('login');
  const [role, setRole] = React.useState<'user' | 'admin'>('user');
  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [regName, setRegName] = React.useState('');
  const [regEmail, setRegEmail] = React.useState('');
  const [regPassword, setRegPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [modalMessage, setModalMessage] = React.useState('');
  const [sessionVersion, setSessionVersion] = React.useState(0);

  const loggedIn = isAuthenticated();
  const user = React.useMemo(() => getStoredUser(), [sessionVersion]);

  const openLoginModal = () => {
    setMode('login');
    setModalMessage('');
    setShowAuthModal(true);
  };

  const closeModalAndGoHome = () => {
    setShowAuthModal(false);
    if (window.location.pathname !== '/') {
      window.location.assign('/');
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setModalMessage('');
    const action = role === 'admin' ? loginAsAdmin : loginAsUser;
    const result = await action({ email: loginEmail.trim(), password: loginPassword });
    setBusy(false);
    setModalMessage(result.message);
    if (result.success) {
      setSessionVersion((x) => x + 1);
      setLoginPassword('');
      setModalMessage('');
      closeModalAndGoHome();
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setModalMessage('');
    const result = await register({
      name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
    });
    setBusy(false);
    setModalMessage(result.message);
    if (result.success) {
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setModalMessage('');
      closeModalAndGoHome();
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    await logout();
    setBusy(false);
    setSessionVersion((x) => x + 1);
    if (window.location.pathname.startsWith('/admin')) {
      window.location.assign('/');
    }
  };

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-badge">T</span>
            <div>
              <p className="brand-title">Tournaments</p>
              <p className="brand-subtitle">Play. Track. Win.</p>
            </div>
          </div>
          <nav className="topbar-nav" aria-label="Main">
            <NavLink to="/" className="nav-link">
              Home
            </NavLink>
            <NavLink to="/tournaments" className="nav-link">
              Tournaments
            </NavLink>
            <NavLink to="/profile" className="nav-link">
              Profile
            </NavLink>
            {user?.role === 'admin' ? (
              <NavLink to="/admin" className="nav-link">
                Admin
              </NavLink>
            ) : null}
            {!loggedIn ? (
              <button type="button" className="btn btn-primary nav-auth-btn" onClick={openLoginModal}>
                Login
              </button>
            ) : (
              <button type="button" className="btn btn-ghost nav-auth-btn" onClick={handleLogout} disabled={busy}>
                Logout
              </button>
            )}
          </nav>
        </header>
        <main className="page-wrap">
          {loggedIn && user ? (
            <p className="nav-user">
              Signed in as <strong>{user.name || user.email}</strong> ({user.role})
            </p>
          ) : null}
          <AppRoutes />
        </main>
      </div>

      {showAuthModal ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowAuthModal(false)}>
          <section
            className="modal-card panel page-enter"
            role="dialog"
            aria-modal="true"
            aria-label="Authentication"
            onClick={(e) => e.stopPropagation()}
          >
            {mode === 'login' ? (
              <>
                <p className="eyebrow">Welcome Back</p>
                <h2>Login</h2>
                {modalMessage ? <p className="message-text">{modalMessage}</p> : null}
                <form className="auth-form" onSubmit={handleLogin}>
                  <div className="auth-switch">
                    <button
                      type="button"
                      className={`mode-btn ${role === 'user' ? 'active' : ''}`}
                      onClick={() => setRole('user')}
                    >
                      User
                    </button>
                    <button
                      type="button"
                      className={`mode-btn ${role === 'admin' ? 'active' : ''}`}
                      onClick={() => setRole('admin')}
                    >
                      Admin
                    </button>
                  </div>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Email"
                    required
                  />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Password"
                    required
                  />
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    {busy ? 'Please wait...' : `Login as ${role}`}
                  </button>
                </form>
                <p className="auth-note">
                  New user?{' '}
                  <button type="button" className="auth-link-btn" onClick={() => setMode('register')}>
                    Register here
                  </button>
                </p>
              </>
            ) : (
              <>
                <p className="eyebrow">Create Account</p>
                <h2>Register</h2>
                {modalMessage ? <p className="message-text">{modalMessage}</p> : null}
                <form className="auth-form" onSubmit={handleRegister}>
                  <input
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Full name"
                    required
                  />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="Email"
                    required
                  />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Password (min 6 chars)"
                    required
                  />
                  <button type="submit" className="btn btn-secondary" disabled={busy}>
                    {busy ? 'Please wait...' : 'Register'}
                  </button>
                </form>
                <p className="auth-note">
                  Already have an account?{' '}
                  <button type="button" className="auth-link-btn" onClick={() => setMode('login')}>
                    Login here
                  </button>
                </p>
              </>
            )}
            <button type="button" className="btn btn-ghost modal-close-btn" onClick={() => setShowAuthModal(false)}>
              Close
            </button>
          </section>
        </div>
      ) : null}
    </BrowserRouter>
  );
};

export default App;
