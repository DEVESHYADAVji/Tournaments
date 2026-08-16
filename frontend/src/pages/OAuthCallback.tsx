import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthCallback: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('authToken', token);
      window.history.replaceState({}, document.title, '/oauth/callback');
      navigate('/tournaments', { replace: true });
      return;
    }
    navigate('/login', { replace: true });
  }, [navigate, params]);

  return <main className="loading-view"><p>Completing sign-in...</p></main>;
};

export default OAuthCallback;
