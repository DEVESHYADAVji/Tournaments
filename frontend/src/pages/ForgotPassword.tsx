import React from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../features/auth/auth.api';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [resetUrl, setResetUrl] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setMessage(''); setResetUrl('');
    const result = await requestPasswordReset(email.trim());
    setBusy(false); setMessage(result.message);
    if (result.development_reset_url) setResetUrl(result.development_reset_url);
  };

  return <section className="auth-page page-enter"><div className="panel auth-panel"><div className="panel-inner">
    <p className="section-label">Account recovery</p><h1>Reset your password</h1>
    <p>Enter your account email. If it exists, we will send a secure reset link.</p>
    {message ? <p className="message-text" role="status">{message}</p> : null}
    {resetUrl ? <p className="message-text"><a href={resetUrl}>Open development reset link</a></p> : null}
    <form className="form-stack" onSubmit={submit}>
      <label className="field-label" htmlFor="forgot-email">Email</label>
      <input id="forgot-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send reset link'}</button>
    </form>
    <p><Link to="/">Back to sign in</Link></p>
  </div></div></section>;
};
export default ForgotPassword;
