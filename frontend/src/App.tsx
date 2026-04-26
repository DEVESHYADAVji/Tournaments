import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Header from './compoments/Header/Header';
import NavBar from './compoments/NavBar/NavBar';
import AppRoutes from './routes/AppRoutes';
import FloatingHelpIcon from './compoments/FloatingHelpIcon/FloatingHelpIcon';
import HelpChat from './compoments/HelpChat/HelpChat';
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
  const [showHelpChat, setShowHelpChat] = React.useState(false);
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

  void sessionVersion;
  const loggedIn = isAuthenticated();
  const user = getStoredUser();

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
      <div className="app-wrapper">
        <Header 
          user={user} 
          loggedIn={loggedIn} 
          onLoginClick={openLoginModal}
          onLogoutClick={handleLogout}
          busy={busy}
        />
        <NavBar user={user} />
        <main className="page-wrap">
          <AppRoutes />
        </main>
      </div>

      {showAuthModal ? (
        <div className="auth-modal-backdrop" role="presentation" onClick={() => setShowAuthModal(false)}>
          <section
            className="auth-modal panel page-enter"
            role="dialog"
            aria-modal="true"
            aria-label="Authentication"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-inner">
            {mode === 'login' ? (
              <>
                <p className="section-label">Welcome back</p>
                <h2>Enter your match lobby</h2>
                <p>Sign in as a player or admin to manage tournaments, registrations, and match data.</p>
                {modalMessage ? <p className="message-text">{modalMessage}</p> : null}
                <form className="form-stack" onSubmit={handleLogin}>
                  <div className="auth-switch">
                    <button
                      type="button"
                      className={`btn ${role === 'user' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setRole('user')}
                    >
                      Player
                    </button>
                    <button
                      type="button"
                      className={`btn ${role === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
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
                <p>
                  New here?{' '}
                  <button type="button" className="btn btn-linklike" onClick={() => setMode('register')}>
                    Create an account
                  </button>
                </p>
              </>
            ) : (
              <>
                <p className="section-label">Create account</p>
                <h2>Start competing in minutes</h2>
                <p>Register once, then join tournaments, track your entries, and manage your profile from one place.</p>
                {modalMessage ? <p className="message-text">{modalMessage}</p> : null}
                <form className="form-stack" onSubmit={handleRegister}>
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
                <p>
                  Already have an account?{' '}
                  <button type="button" className="btn btn-linklike" onClick={() => setMode('login')}>
                    Sign in
                  </button>
                </p>
              </>
            )}
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowAuthModal(false)}>
                Close
              </button>
            </div>
            </div>
          </section>
        </div>
      ) : null}

      <FloatingHelpIcon onClick={() => setShowHelpChat(true)} />
      <HelpChat isOpen={showHelpChat} onClose={() => setShowHelpChat(false)} />
    </BrowserRouter>
  );
};

export default App;
