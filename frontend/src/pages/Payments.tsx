import React from 'react';
import type { AxiosError } from 'axios';
import { isAuthenticated } from '../features/auth/auth.api';
import httpClient from '../services/http';

declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void }; } }

interface PaymentConfig { configured: boolean; key_id?: string | null; }
interface Order { id: number; order_id: string; amount: number; currency: string; status: string; }

const Payments: React.FC = () => {
  const [tournamentId, setTournamentId] = React.useState('');
  const [config, setConfig] = React.useState<PaymentConfig | null>(null);
  const [payments, setPayments] = React.useState<Order[]>([]);
  const [message, setMessage] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!isAuthenticated()) return;
    void Promise.all([httpClient.get('/payments/config'), httpClient.get('/payments/me')]).then(([configResponse, paymentsResponse]) => {
      setConfig(configResponse.data as PaymentConfig);
      setPayments(paymentsResponse.data as Order[]);
    }).catch(() => setMessage('Unable to load payment information.'));
  }, []);

  const loadCheckout = async () => {
    if (window.Razorpay) return true;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Unable to load Razorpay Checkout'));
      document.body.appendChild(script);
    });
    return Boolean(window.Razorpay);
  };

  const pay = async () => {
    if (!tournamentId) return;
    setBusy(true);
    setMessage('');
    try {
      if (!config?.configured || !config.key_id) throw new Error('Razorpay is not configured for this environment.');
      const response = await httpClient.post(`/payments/tournaments/${Number(tournamentId)}/order`);
      const order = response.data as Order;
      if (!(await loadCheckout()) || !window.Razorpay) throw new Error('Payment checkout is unavailable.');
      const checkout = new window.Razorpay({
        key: config.key_id,
        amount: order.amount * 100,
        currency: order.currency,
        name: 'Tournaments',
        description: `Tournament entry #${tournamentId}`,
        order_id: order.order_id,
        handler: async (result: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await httpClient.post('/payments/verify', { order_id: result.razorpay_order_id, payment_id: result.razorpay_payment_id, signature: result.razorpay_signature });
            setMessage('Payment verified successfully.');
            const refreshed = await httpClient.get('/payments/me');
            setPayments(refreshed.data as Order[]);
          } catch (error) {
            setMessage((error as AxiosError<{ detail?: string }>)?.response?.data?.detail || 'Payment verification failed.');
          }
        },
        modal: { ondismiss: () => setMessage('Payment window closed.') },
      });
      checkout.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to start payment.');
    } finally {
      setBusy(false);
    }
  };

  if (!isAuthenticated()) return <section className="section-card page-enter"><div className="section-card-inner"><h1>Sign in to manage payments.</h1></div></section>;

  return (
    <div className="section-stack page-enter">
      <section className="hero-surface"><div className="hero-inner"><p className="section-label">Payments</p><h1 className="hero-title">Secure tournament entry payments.</h1><p>Payments are verified server-side before being marked paid.</p></div></section>
      <section className="section-card"><div className="section-card-inner"><label className="field-label" htmlFor="payment-tournament">Tournament ID</label><input id="payment-tournament" type="number" min="1" value={tournamentId} onChange={(event) => setTournamentId(event.target.value)} placeholder="Enter tournament ID" /><button type="button" className="btn btn-primary" onClick={() => void pay()} disabled={busy || !tournamentId}>{busy ? 'Starting payment...' : 'Pay entry fee'}</button>{message ? <p className="message-text">{message}</p> : null}</div></section>
      <section className="section-card"><div className="section-card-inner"><p className="section-label">History</p><h2>My payments</h2>{payments.length ? payments.map((payment) => <article key={payment.id} className="announcement-card"><div><strong>Order {payment.order_id}</strong><p>Tournament #{payment.tournament_id} · ₹{payment.amount} · {payment.status}</p></div></article>) : <div className="empty-state"><h3>No payments yet</h3><p>Completed tournament entry payments will appear here.</p></div>}</div></section>
    </div>
  );
};

export default Payments;
