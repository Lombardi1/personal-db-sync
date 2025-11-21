import { LogOut, Users, Settings, Contact, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import logoAG from '@/assets/logo-ag.jpg';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SummaryHeader() {
  const { user, logout, isAmministratore } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="app-header transition-all duration-300" style={{ background: 'hsl(var(--summary-header-color))' }}>
      <div className="max-w-[1400px] mx-auto px-3 sm:px-5">
        <div className="flex items-center justify-between flex-wrap gap-y-2">
          <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3">
            <img src={logoAG} alt="AG Lombardi Logo" className="h-8 w-8 sm:h-10 sm:w-10 object-contain" />
            <span className="hidden sm:inline">Gestionale AGLombardi</span>
            <span className="inline sm:hidden text-lg">AGL</span>
          </h1>
          
          {user && (
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
              <span className="text-xs sm:text-sm text-white/90">
                {isAmministratore ? 'Admin' : 'Stampa'}: <strong className="text-white">{user.username}</strong>
              </span>
              {isAmministratore && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <Settings className="mr-1 h-5 w-5 sm:mr-2 sm:h-6 sm:w-6" />
                      <span className="hidden sm:inline">Impostazioni</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate('/gestione-utenti')}>
                      <Users className="mr-2 h-4 w-4" />
                      Gestione Utenti
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/anagrafica')}>
                      <Contact className="mr-2 h-4 w-4" />
                      Gestione Anagrafiche
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/azienda-info')}> {/* Voce di menu diretta */}
                      <Building2 className="mr-2 h-4 w-4" />
                      Gestione Azienda
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <LogOut className="mr-1 h-5 w-5 sm:mr-2 sm:h-6 sm:w-6" />
                <span className="hidden sm:inline">Esci</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}