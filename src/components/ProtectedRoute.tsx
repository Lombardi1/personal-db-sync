import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('stampa' | 'amministratore' | 'macchina')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(210,40%,96%)] flex items-center justify-center">
        <div className="text-lg text-[hsl(var(--muted-foreground))]">Caricamento...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect alla home corretta per ruolo
    if (user.role === 'macchina' && user.macchina_id) {
      return <Navigate to={`/macchina/${user.macchina_id}`} replace />;
    }
    if (user.role === 'stampa') {
      return <Navigate to="/stampa-dashboard" replace />;
    }
    return <Navigate to="/summary" replace />;
  }

  return <>{children}</>;
}
