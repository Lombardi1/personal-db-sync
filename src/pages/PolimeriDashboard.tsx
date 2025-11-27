import { useState, useEffect } from 'react';
import { usePolimeri } from '@/hooks/usePolimeri';
import { Header } from '@/components/Header';
import { PolimeriTabs } from '@/components/PolimeriTabs';
import { Toaster } from '@/components/ui/sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

// Importa i componenti delle schede
import { GiacenzaPolimeriTab } from '@/components/tabs/GiacenzaPolimeriTab';
import { CaricoPolimeroTab } from '@/components/tabs/CaricoPolimeroTab';
import { StoricoPolimeriTab } from '@/components/tabs/StoricoPolimeriTab';

const GestionePolimeri = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'giacenza'; // Default a 'giacenza'

  const [activeTab, setActiveTab] = useState(initialTab);
  const polimeriData = usePolimeri();

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

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header 
        title="Gestione Magazzino Polimeri" 
        activeTab="polimeri" 
        showUsersButton={true} 
      />
      
      <div className="mx-auto p-3 sm:p-5 md:px-8">
        <div className="flex justify-end mb-4">
          <Button onClick={() => navigate('/summary')} variant="outline" size="sm" className="text-sm">
            <Home className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            Torna alla Dashboard
          </Button>
        </div>

        <PolimeriTabs 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          counts={{
            giacenza: polimeriData.polimeri.length,
            storico: polimeriData.storicoPolimeri.length
          }}
        />

        <div className="bg-white border border-[hsl(214,32%,91%)] rounded-b-lg rounded-tr-lg shadow-sm p-6">
          {activeTab === 'giacenza' && <GiacenzaPolimeriTab {...polimeriData} />}
          {activeTab === 'carico' && <CaricoPolimeroTab aggiungiPolimero={polimeriData.aggiungiPolimero} />}
          {activeTab === 'storico' && <StoricoPolimeriTab storico={polimeriData.storicoPolimeri} />}
        </div>
      </div>

      <Toaster />
    </div>
  );
};

export default GestionePolimeri;