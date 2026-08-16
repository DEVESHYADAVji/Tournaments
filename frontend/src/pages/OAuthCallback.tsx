import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import httpClient from '../services/http';

const OAuthCallback: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const complete = async () => {
      const token = params.get('token');
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }
      localStorage.setItem('authToken', token);
      try {
        const response = await httpClient.get('/profile', { headers: { Authorization: `Bearer ${token}` } });
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch {
        localStorage.removeItem('authToken');
        navigate('/login', { replace: true });
        return;
      }
      window.history.replaceState({}, document.title, '/oauth/callback');
      navigate('/tournaments', { replace: true });
    };
    void complete();
  }, [navigate, params]);

  return <main className="loading-view"><p>Completing sign-in...</p></main>;
};

export default OAuthCallback;
