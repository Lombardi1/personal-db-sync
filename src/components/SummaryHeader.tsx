import { LogOut, Users, Settings, Contact, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import logoAG from '@/assets/logo-ag.jpg';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { currentAppVersion, releaseNotes } from '@/config/releaseNotes';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles } from 'lucide-react';

export function SummaryHeader() {
  const { user, logout, isAmministratore } = useAuth();
  const navigate = useNavigate();
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);

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
                    <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/azienda-info')}>
                      <Building2 className="mr-2 h-4 w-4" />
                      Gestione Azienda
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button onClick={handleLogout} variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <LogOut className="mr-1 h-5 w-5 sm:mr-2 sm:h-6 sm:w-6" />
                <span className="hidden sm:inline">Esci</span>
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Version number in bottom left corner */}
      <div 
        className="fixed bottom-2 left-2 text-xs text-white/70 cursor-pointer hover:text-white/90 transition-colors flex items-center gap-1"
        onClick={() => setShowReleaseNotes(true)}
      >
        <Sparkles className="h-3 w-3" />
        v{currentAppVersion}
      </div>
      
      {/* Release Notes Dialog */}
      <Dialog open={showReleaseNotes} onOpenChange={setShowReleaseNotes}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader className="bg-[hsl(var(--whats-new-color))] text-white p-4 rounded-t-lg -mx-6 -mt-6 mb-4 flex flex-row items-center gap-3">
            <Sparkles className="h-6 w-6" />
            <DialogTitle className="text-xl sm:text-2xl font-bold">Novità del Gestionale</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-sm sm:text-base text-muted-foreground mb-4">
            Scopri le ultime funzionalità e miglioramenti introdotti in questa versione.
          </DialogDescription>
          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-6">
              {releaseNotes.map((release) => (
                <div key={release.version} className="pb-4 border-b-0">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <span className="text-[hsl(var(--whats-new-color))]">v{release.version}</span> - {release.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">{release.date}</p>
                  {release.features.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-foreground mb-1">Nuove Funzionalità:</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {release.features.map((feature, fIndex) => (
                          <li key={fIndex} dangerouslySetInnerHTML={{ __html: feature }} />
                        ))}
                      </ul>
                    </div>
                  )}
                  {release.bugFixes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-1">Correzioni Bug:</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {release.bugFixes.map((bug, bIndex) => (
                          <li key={bIndex} dangerouslySetInnerHTML={{ __html: bug }} />
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter className="mt-6">
            <Button 
              onClick={() => setShowReleaseNotes(false)} 
              className="bg-[hsl(var(--whats-new-color))] hover:bg-[hsl(var(--whats-new-color-dark))] text-white"
            >
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}