import { LogOut, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  activeTab?: string;
}

export function Header({ activeTab = 'dashboard' }: HeaderProps) {
  const { user, logout, isAmministratore } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };
  const getHeaderColor = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'linear-gradient(135deg, hsl(var(--dashboard-color)), hsl(217, 91%, 45%))';
      case 'ordini':
        return 'linear-gradient(135deg, hsl(var(--ordini-color)), hsl(0, 72%, 40%))';
      case 'esauriti':
        return 'linear-gradient(135deg, hsl(var(--esauriti-color)), hsl(142, 71%, 30%))';
      case 'carico':
        return 'linear-gradient(135deg, hsl(var(--carico-color)), hsl(262, 66%, 42%))';
      case 'storico':
        return 'linear-gradient(135deg, hsl(var(--storico-color)), hsl(37, 93%, 35%))';
      default:
        return 'linear-gradient(135deg, hsl(var(--primary)), hsl(223 73% 27%))';
    }
  };

  return (
    <header className="app-header transition-all duration-300" style={{ background: getHeaderColor() }}>
      <div className="max-w-[1400px] mx-auto px-5">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <i className="fas fa-box-open"></i>
            Gestione Magazzino Cartoni
          </h1>
          
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/90">
                {isAmministratore ? 'Admin' : 'Produzione'}: {user.username}
              </span>
              {isAmministratore && (
                <Button
                  onClick={() => navigate('/gestione-utenti')}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Gestione Utenti
                </Button>
              )}
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Esci
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
