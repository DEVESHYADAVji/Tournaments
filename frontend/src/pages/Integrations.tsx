import React, { useEffect, useState } from 'react';
import httpClient from '../services/http';

interface HealthState {
  oauth_google: boolean;
  oauth_facebook: boolean;
  discord: boolean;
  stream: boolean;
  ai: boolean;
}

const Integrations: React.FC = () => {
  const [health, setHealth] = useState<HealthState | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [healthResponse, streamResponse] = await Promise.all([
          httpClient.get<HealthState>('/integrations/health'),
          httpClient.get<{ configured: boolean; embed_url?: string }>('/integrations/stream'),
        ]);
        setHealth(healthResponse.data);
        setStreamUrl(streamResponse.data.configured ? streamResponse.data.embed_url || null : null);
      } catch {
        setHealth(null);
      }
    };
    void load();
  }, []);

  const login = async (provider: 'google' | 'facebook') => {
    const response = await httpClient.get<{ configured: boolean; authorization_url?: string }>(`/integrations/oauth/${provider}`);
    if (response.data.authorization_url) window.location.assign(response.data.authorization_url);
  };

  return (
    <main className="page-shell">
      <section className="feature-card">
        <h1>Platform Integrations</h1>
        <p>Connect social login, community announcements, AI, and tournament streaming.</p>
        <div className="action-row">
          <button type="button" onClick={() => void login('google')} disabled={!health?.oauth_google}>Continue with Google</button>
          <button type="button" onClick={() => void login('facebook')} disabled={!health?.oauth_facebook}>Continue with Facebook</button>
        </div>
        {streamUrl && <iframe title="Tournament stream" src={streamUrl} allowFullScreen style={{ width: '100%', minHeight: 420, border: 0, marginTop: 24 }} />}
        <div className="feature-grid" aria-live="polite">
          {health && Object.entries(health).map(([key, value]) => <div key={key}><strong>{key.replaceAll('_', ' ')}</strong><span>{value ? 'Configured' : 'Not configured'}</span></div>)}
        </div>
      </section>
    </main>
  );
};

export default Integrations;
