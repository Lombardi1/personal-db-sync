import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as notifications from '@/utils/notifications';
import logoAG from '@/assets/logo-ag.jpg';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      notifications.showError('Inserisci username e password');
      return;
    }
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.success) {
      notifications.showSuccess('Login effettuato con successo');
      if (result.user?.role === 'stampa') {
        navigate('/stampa-dashboard');
      } else {
        navigate('/summary');
      }
    } else {
      notifications.showError(result.error || 'Errore durante il login');
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <img src={logoAG} alt="AG Lombardi Logo" className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-3 sm:mb-4 object-contain" />
          <h1 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))]">
            Gestionale AGLombardi
          </h1>
          <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))] mt-1 sm:mt-2">
            Accedi al sistema
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="username" className="text-sm sm:text-base">Username</Label>
            <Input 
              id="username" 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Inserisci username" 
              disabled={loading}
              autoComplete="username"
              className="text-sm sm:text-base"
            />
          </div>
          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Inserisci password" 
              disabled={loading}
              autoComplete="current-password"
              className="text-sm sm:text-base"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-[hsl(30,100%,50%)] hover:bg-[hsl(30,100%,40%)] text-white text-base sm:text-lg py-2 sm:py-2.5"
            disabled={loading}
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </Button>
        </form>
      </div>
    </div>
  );
}