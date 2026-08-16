import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Header from './compoments/Header/Header';
import NavBar from './compoments/NavBar/NavBar';
import AppRoutes from './routes/AppRoutes';
import FloatingHelpIcon from './compoments/FloatingHelpIcon/FloatingHelpIcon';
import HelpChat from './compoments/HelpChat/HelpChat';
import { getStoredUser, isAuthenticated, loginAsAdmin, loginAsUser, logout, register } from './features/auth/auth.api';

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

  const openLoginModal = () => { setMode('login'); setRole('user'); setModalMessage(''); setShowAuthModal(true); };
  const closeModalAndGoHome = () => { setShowAuthModal(false); if (window.location.pathname !== '/') window.location.assign('/'); };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setModalMessage('');
    const action = role === 'admin' ? loginAsAdmin : loginAsUser;
    const result = await action({ email: loginEmail.trim(), password: loginPassword });
    setBusy(false);
    if (!result.success) { setModalMessage(result.message); return; }
    setSessionVersion((x) => x + 1); setLoginPassword('');
    setModalMessage(`Login successful. Welcome ${role === 'admin' ? 'Admin' : 'Player'}!`);
    window.setTimeout(closeModalAndGoHome, 500);
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setModalMessage('');
    const result = await register({ name: regName.trim(), email: regEmail.trim(), password: regPassword });
    setBusy(false); setModalMessage(result.message);
    if (result.success) {
      const registeredEmail = regEmail.trim();
      setRegName(''); setRegEmail(''); setRegPassword(''); setMode('login'); setLoginEmail(registeredEmail);
      setModalMessage('Registration successful. Your player account is ready; please sign in.');
    }
  };

  const handleLogout = async () => {
    setBusy(true); const result = await logout(); setBusy(false); setSessionVersion((x) => x + 1);
    if (window.location.pathname.startsWith('/admin')) window.location.assign('/');
    if (!result.success) window.alert(result.message);
  };

  return <BrowserRouter>
    <div className="app-wrapper"><Header user={user} loggedIn={loggedIn} onLoginClick={openLoginModal} onLogoutClick={handleLogout} busy={busy} /><NavBar user={user} /><main className="page-wrap"><AppRoutes /></main></div>
    {showAuthModal ? <div className="auth-modal-backdrop" role="presentation" onClick={() => setShowAuthModal(false)}>
      <section className="auth-modal panel page-enter" role="dialog" aria-modal="true" aria-label="Authentication" onClick={(e) => e.stopPropagation()}><div className="panel-inner">
        {mode === 'login' ? <>
          <p className="section-label">Welcome back</p><h2>{role === 'admin' ? 'Admin control room' : 'Enter your match lobby'}</h2>
          <p>{role === 'admin' ? 'Admin access is restricted to approved administrator accounts.' : 'Sign in to join tournaments, manage your teams, and track your competitive history.'}</p>
          {modalMessage ? <p className="message-text" role="status">{modalMessage}</p> : null}
          <form className="form-stack" onSubmit={handleLogin}>
            <div className="auth-switch"><button type="button" className={`btn ${role === 'user' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setRole('user'); setModalMessage(''); }}>Player</button><button type="button" className={`btn ${role === 'admin' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setRole('admin'); setModalMessage(''); }}>Admin</button></div>
            <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Email" required autoComplete="email" />
            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" required autoComplete="current-password" />
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Please wait...' : `Login as ${role}`}</button>
          </form>
          <p><button type="button" className="btn btn-linklike" onClick={() => window.location.assign('/forgot-password')}>Forgot password?</button></p>
          <p>New here? <button type="button" className="btn btn-linklike" onClick={() => { setMode('register'); setModalMessage(''); }}>Create a player account</button></p>
        </> : <>
          <p className="section-label">Create player account</p><h2>Start competing in minutes</h2>
          <p>Registration creates a standard player account. Administrator accounts are provisioned separately and cannot be created from this form.</p>
          {modalMessage ? <p className="message-text" role="status">{modalMessage}</p> : null}
          <form className="form-stack" onSubmit={handleRegister}>
            <input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Full name" required autoComplete="name" />
            <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="Email" required autoComplete="email" />
            <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="Password (min 8 chars)" minLength={8} required autoComplete="new-password" />
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Please wait...' : 'Register as player'}</button>
          </form>
          <p>Already have an account? <button type="button" className="btn btn-linklike" onClick={() => { setMode('login'); setModalMessage(''); }}>Sign in</button></p>
        </>}
        <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setShowAuthModal(false)}>Close</button></div>
      </div></section>
    </div> : null}
    <FloatingHelpIcon onClick={() => setShowHelpChat(true)} /><HelpChat isOpen={showHelpChat} onClose={() => setShowHelpChat(false)} />
  </BrowserRouter>;
};
export default App;
