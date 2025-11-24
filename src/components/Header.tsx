import { LogOut, Users, Settings, Contact, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import logoAG from '@/assets/LOGO.png'; // Aggiornato il percorso del logo
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  activeTab?: string;
  title?: string;
  showUsersButton?: boolean;
}

export function Header({ 
  activeTab = 'giacenza', 
  title = 'Gestione Magazzino Cartoni',
  showUsersButton
}: HeaderProps) {
  const { user, logout, isAmministratore } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getHeaderColor = () => {
    let currentSection = activeTab;
    if (location.pathname === '/scarico-magazzino-stampa') {
      currentSection = 'scarico-magazzino';
    } else if (location.pathname === '/gestione-utenti') {
      currentSection = 'gestione-utenti';
    } else if (location.pathname === '/anagrafica') {
      const queryParams = new URLSearchParams(location.search);
      currentSection = queryParams.get('tab') || 'anagrafica';
    } else if (location.pathname === '/ordini-acquisto') {
      currentSection = 'ordini-acquisto';
    } else if (location.pathname === '/storico-stampa') {
      currentSection = 'storico-stampa';
    } else if (location.pathname === '/azienda-info') { // NUOVO: Colore per la pagina AziendaInfo
      currentSection = 'azienda-info';
    } else if (location.pathname === '/gestione-magazzino') {
      const queryParams = new URLSearchParams(location.search);
      currentSection = queryParams.get('tab') || 'giacenza';
    }

    switch (currentSection) {
      case 'giacenza':
        return 'linear-gradient(135deg, hsl(var(--dashboard-color)), hsl(217, 91%, 45%))';
      case 'ordini':
        return 'linear-gradient(135deg, hsl(var(--ordini-color)), hsl(0, 72%, 40%))';
      case 'esauriti':
        return 'linear-gradient(135deg, hsl(var(--esauriti-color)), hsl(142, 71%, 30%))';
      case 'carico':
        return 'linear-gradient(135deg, hsl(var(--carico-color)), hsl(262, 66%, 42%))';
      case 'storico':
      case 'storico-stampa':
        return 'linear-gradient(135deg, hsl(var(--storico-color)), hsl(37, 93%, 35%))';
      case 'scarico-magazzino':
        return 'linear-gradient(135deg, hsl(var(--danger)), hsl(0, 72%, 40%))';
      case 'gestione-utenti':
      case 'anagrafica':
      case 'clienti':
      case 'fornitori':
      case 'ordini-acquisto':
      case 'azienda-info': // NUOVO: Colore per la pagina AziendaInfo
        return 'hsl(var(--summary-header-color))';
      default:
        return 'linear-gradient(135deg, hsl(var(--primary)), hsl(223 73% 27%))';
    }
  };

  const defaultShowUsersButton = isAmministratore;

  return (
    <header className="app-header transition-all duration-300" style={{ background: getHeaderColor() }}>
      <div className="max-w-[1400px] mx-auto px-3 sm:px-5">
        <div className="flex items-center justify-between flex-wrap gap-y-2">
          <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3">
            <img src={logoAG} alt="AG Lombardi Logo" className="h-12 w-12 sm:h-16 sm:w-16 object-contain" />
            <span className="hidden sm:inline">{title}</span>
            <span className="inline sm:hidden text-lg">AGL</span>
          </h1>
          
          {user && (
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
              <span className="text-xs sm:text-sm text-white/90">
                {isAmministratore ? 'Admin' : 'Stampa'}: <strong>{user.username}</strong>
              </span>
              {(showUsersButton === undefined ? defaultShowUsersButton : showUsersButton) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <Settings className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
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
                    <DropdownMenuSeparator /> {/* Separatore aggiunto qui */}
                    <DropdownMenuItem onClick={() => navigate('/azienda-info')}>
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
                <LogOut className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Esci</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}