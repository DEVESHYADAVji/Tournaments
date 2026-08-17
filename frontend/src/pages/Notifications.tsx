import React from 'react';
import httpClient from '../services/http';

interface Notification { id: number; title: string; content: string; read: boolean; created_at: string; }

const Notifications: React.FC = () => {
  const [items, setItems] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const response = await httpClient.get('/notifications');
      setItems(response.data as Notification[]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const markRead = async (id: number) => {
    await httpClient.post(`/notifications/${id}/read`);
    setItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
  };

  return (
    <div className="section-stack page-enter">
      <section className="hero-surface"><div className="hero-inner"><p className="section-label">Notifications</p><h1 className="hero-title">Stay ahead of tournament changes.</h1><p>Registration, organizer, and competition updates are collected here.</p></div></section>
      <section className="section-card"><div className="section-card-inner">
        {loading ? <div className="loading-view"><div className="spinner" /><p>Loading notifications...</p></div> : items.length ? items.map((item) => (
          <article key={item.id} className="announcement-card">
            <div className="inline-actions"><span className="small-pill">{item.read ? 'Read' : 'New'}</span><span className="meta-label">{new Date(item.created_at).toLocaleString()}</span></div>
            <h3>{item.title}</h3><p>{item.content}</p>
            {!item.read ? <button type="button" className="btn btn-secondary" onClick={() => void markRead(item.id)}>Mark as read</button> : null}
          </article>
        )) : <div className="empty-state"><h3>You're all caught up</h3><p>New tournament updates will appear here.</p></div>}
      </div></section>
    </div>
  );
};

export default Notifications;
