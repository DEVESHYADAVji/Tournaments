import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../features/auth/auth.api';

const ResetPassword: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const token = params.get('token') || '';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage('');
    if (!token) { setMessage('This password reset link is missing its token.'); return; }
    if (password !== confirm) { setMessage('Passwords do not match.'); return; }
    setBusy(true); const result = await resetPassword(token, password); setBusy(false); setMessage(result.message);
    if (result.success) window.setTimeout(() => navigate('/'), 900);
  };

  return <section className="auth-page page-enter"><div className="panel auth-panel"><div className="panel-inner">
    <p className="section-label">Account recovery</p><h1>Create a new password</h1>
    <p>Choose a strong password of at least eight characters.</p>
    {message ? <p className="message-text" role="status">{message}</p> : null}
    <form className="form-stack" onSubmit={submit}>
      <label className="field-label" htmlFor="reset-password">New password</label>
      <input id="reset-password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" />
      <label className="field-label" htmlFor="reset-confirm">Confirm password</label>
      <input id="reset-confirm" type="password" minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} required autoComplete="new-password" />
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Updating...' : 'Update password'}</button>
    </form>
    <p><Link to="/">Return to sign in</Link></p>
  </div></div></section>;
};
export default ResetPassword;
