import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';

export default function AgenteConferme() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/log-conferme', { replace: true });
  }, [navigate]);

  if (authLoading) return <div>Caricamento...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return null;
}
