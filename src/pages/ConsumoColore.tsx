import { useState, useEffect } from 'react';
import { useColori } from '@/hooks/useColori';
import { Header } from '@/components/Header';
import { ColoriTabs } from '@/components/ColoriTabs';
import { GiacenzaColoriTab } from '@/components/tabs/GiacenzaColoriTab';
import { CaricoColoreTab } from '@/components/tabs/CaricoColoreTab';
import { ScaricoColoreTab } from '@/components/tabs/ScaricoColoreTab';
import { StoricoColoriTab } from '@/components/tabs/StoricoColoriTab';
import { Toaster } from '@/components/ui/sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const ConsumoColore = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAmministratore } = useAuth();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'colori-giacenza';

  const [activeTab, setActiveTab] = useState(initialTab);
  const coloriData = useColori();

  useEffect(() => {
    if (activeTab !== queryParams.get('tab')) {
      navigate(`?tab=${activeTab}`, { replace: true });
    }
  }, [activeTab]);

  useEffect(() => {
    const tabFromUrl = queryParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [location.search]);

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header
        title="Consumo Colore"
        activeTab="colori"
        showUsersButton={isAmministratore}
      />

      <div className="mx-auto p-3 sm:p-5 md:px-8">
        <div className="flex justify-end mb-4">
          <Button
            onClick={() => navigate(isAmministratore ? '/summary' : '/stampa-dashboard')}
            variant="outline"
            size="sm"
            className="text-sm"
          >
            <Home className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            Torna alla Dashboard
          </Button>
        </div>

        <ColoriTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          counts={{
            giacenza: coloriData.colori.length,
            storico: coloriData.storicoColori.length,
          }}
        />

        <div className="bg-white border border-[hsl(214,32%,91%)] rounded-b-lg rounded-tr-lg shadow-sm p-6">
          {activeTab === 'colori-giacenza' && (
            <GiacenzaColoriTab
              colori={coloriData.colori}
              loading={coloriData.loading}
              modificaColore={coloriData.modificaColore}
              eliminaColore={coloriData.eliminaColore}
              cambiaDisponibilitaColore={coloriData.cambiaDisponibilitaColore}
              caricoColore={coloriData.caricoColore}
              scaricoColore={coloriData.scaricoColore}
            />
          )}
          {activeTab === 'colori-carico' && (
            <CaricoColoreTab
              colori={coloriData.colori}
              nomiPantoneEsistenti={coloriData.nomiPantoneEsistenti}
              aggiungiColore={coloriData.aggiungiColore}
            />
          )}
          {activeTab === 'colori-scarico' && (
            <ScaricoColoreTab
              colori={coloriData.colori}
              scaricoColore={coloriData.scaricoColore}
            />
          )}
          {activeTab === 'colori-storico' && (
            <StoricoColoriTab storico={coloriData.storicoColori} />
          )}
        </div>
      </div>

      <Toaster />
    </div>
  );
};

export default ConsumoColore;
