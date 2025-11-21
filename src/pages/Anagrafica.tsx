import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, Building2 } from 'lucide-react';
import { AnagraficaTabs } from '@/components/AnagraficaTabs';
import { ClientiTab } from '@/components/tabs/ClientiTab';
import { FornitoriTab } from '@/components/tabs/FornitoriTab';
import { useAnagrafiche } from '@/hooks/useAnagrafiche';
import { useAziendaInfo } from '@/hooks/useAziendaInfo';

export default function Anagrafica() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'clienti';

  const [activeTab, setActiveTab] = useState(initialTab);
  const { 
    clienti, fornitori, loading: anagraficheLoading,
    addCliente, updateCliente, deleteCliente,
    addFornitore, updateFornitore, deleteFornitore,
  } = useAnagrafiche();
  const { aziendaInfo, loading: aziendaInfoLoading } = useAziendaInfo(); // Recupera aziendaInfo

  useEffect(() => {
    if (activeTab !== queryParams.get('tab')) {
      navigate(`?tab=${activeTab}`, { replace: true });
    }
  }, [activeTab, navigate, queryParams]);

  useEffect(() => {
    const tabFromUrl = queryParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [location.search]);

  if (authLoading || anagraficheLoading || aziendaInfoLoading) {
    return (
      <div className="min-h-screen bg-[hsl(210,40%,96%)] flex items-center justify-center">
        <div className="text-lg text-[hsl(var(--muted-foreground))]">Caricamento...</div>
      </div>
    );
  }

  if (!user || user.role !== 'amministratore') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header 
        title="Gestione Anagrafiche" 
        activeTab="anagrafica" 
        showUsersButton={true}
      />
      <div className="max-w-[1400px] mx-auto p-3 sm:p-5 md:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-[hsl(var(--anagrafica-color))] flex items-center gap-2 sm:gap-3 text-center sm:text-left">
            <i className="fas fa-address-book"></i> Gestione Anagrafiche
          </h2>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/summary')} variant="outline" size="sm" className="text-sm">
              <Home className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              Torna alla Dashboard
            </Button>
          </div>
        </div>
        
        <AnagraficaTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="bg-white border border-[hsl(214,32%,91%)] rounded-b-lg rounded-tr-lg shadow-sm p-4 sm:p-6">
          {activeTab === 'clienti' && (
            <ClientiTab 
              clienti={clienti} 
              addCliente={addCliente} 
              updateCliente={updateCliente} 
              deleteCliente={deleteCliente} 
            />
          )}
          {activeTab === 'fornitori' && (
            <FornitoriTab 
              fornitori={fornitori} 
              addFornitore={addFornitore} 
              updateFornitore={updateFornitore} 
              deleteFornitore={deleteFornitore} 
              aziendaInfo={aziendaInfo} // Passo aziendaInfo al FornitoriTab
            />
          )}
        </div>
      </div>
    </div>
  );
}