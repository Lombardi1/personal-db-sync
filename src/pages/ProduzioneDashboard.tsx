import { useState, useEffect } from 'react';
import { useProduzione } from '@/hooks/useProduzione';
import { Header } from '@/components/Header';
import { Toaster } from '@/components/ui/sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, Factory } from 'lucide-react';
import { ProduzioneTabs } from '@/components/ProduzioneTabs';
import { StatoLavoriTab } from '@/components/tabs/StatoLavoriTab';
import { StoricoLavoriTab } from '@/components/tabs/StoricoLavoriTab';
import { GestioneMacchineTab } from '@/components/tabs/GestioneMacchineTab'; // Importa la nuova tab

const ProduzioneDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'stato-lavori'; // Default a 'stato-lavori'

  const [activeTab, setActiveTab] = useState(initialTab);
  const produzioneData = useProduzione();

  // Update URL query param when activeTab changes
  useEffect(() => {
    if (activeTab !== queryParams.get('tab')) {
      navigate(`?tab=${activeTab}`, { replace: true });
    }
  }, [activeTab, navigate, queryParams]);

  // Update activeTab when URL query param changes
  useEffect(() => {
    const tabFromUrl = queryParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [location.search]);

  if (produzioneData.loading) {
    return (
      <div className="min-h-screen bg-[hsl(210,40%,96%)] flex items-center justify-center">
        <div className="text-lg text-[hsl(var(--muted-foreground))]">Caricamento dati produzione...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header 
        title="Gestione Produzione" 
        activeTab="produzione" 
        showUsersButton={true} 
      />
      
      <div className="mx-auto p-3 sm:p-5 md:px-8">
        <div className="flex justify-end mb-4">
          <Button onClick={() => navigate('/summary')} variant="outline" size="sm" className="text-sm">
            <Home className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            Torna alla Dashboard
          </Button>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-[hsl(var(--produzione-color))] flex items-center gap-2 sm:gap-3 text-center sm:text-left mb-4">
          <Factory className="h-7 w-7 sm:h-8 sm:w-8" /> Gestione Produzione
        </h2>

        <ProduzioneTabs 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          counts={{
            macchine: produzioneData.macchine.length,
            lavori: produzioneData.lavori.length,
            storico: produzioneData.storicoLavori.length
          }}
        />

        <div className="bg-white border border-[hsl(214,32%,91%)] rounded-b-lg rounded-tr-lg shadow-sm p-6">
          {activeTab === 'stato-lavori' && <StatoLavoriTab {...produzioneData} />}
          {activeTab === 'storico-lavori' && <StoricoLavoriTab {...produzioneData} />}
          {activeTab === 'gestione-macchine' && <GestioneMacchineTab {...produzioneData} />}
        </div>
      </div>

      <Toaster />
    </div>
  );
};

export default ProduzioneDashboard;