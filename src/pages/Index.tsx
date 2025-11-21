import { useState, useEffect } from 'react';
import { useCartoni } from '@/hooks/useCartoni';
import { Header } from '@/components/Header'; // Use the updated Header component
import { Tabs } from '@/components/Tabs';
import { GiacenzaTab } from '@/components/tabs/GiacenzaTab';
import { OrdiniTab } from '@/components/tabs/OrdiniTab';
import { EsauritiTab } from '@/components/tabs/EsauritiTab';
import { CaricoTab } from '@/components/tabs/CaricoTab';
import { StoricoTab } from '@/components/tabs/StoricoTab';
import { Toaster } from '@/components/ui/sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button'; // Import Button
import { Home } from 'lucide-react'; // Import Home icon

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'giacenza'; // Default to 'giacenza' if no tab in URL

  const [activeTab, setActiveTab] = useState(initialTab);
  const cartoniData = useCartoni();

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
        title="Gestione Magazzino Cartoni" // Explicitly set title
        activeTab={activeTab} // Pass activeTab for color logic
        // showDashboardButton={true} // Removed
        // dashboardButtonTarget="/summary" // Removed
        showUsersButton={true} // Show users button for admin
      />
      
      <div className="mx-auto p-3 sm:p-5 md:px-8">
        <div className="flex justify-end mb-4">
          <Button onClick={() => navigate('/summary')} variant="outline" size="sm" className="text-sm">
            <Home className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            Torna alla Dashboard
          </Button>
        </div>

        <Tabs 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          counts={{
            giacenza: cartoniData.giacenza.length,
            ordini: cartoniData.ordini.length,
            esauriti: cartoniData.esauriti.length,
            storico: cartoniData.storico.length
          }}
        />

        <div className="bg-white border border-[hsl(214,32%,91%)] rounded-b-lg rounded-tr-lg shadow-sm p-6">
          {activeTab === 'giacenza' && <GiacenzaTab {...cartoniData} />}
          {activeTab === 'ordini' && <OrdiniTab {...cartoniData} />}
          {activeTab === 'esauriti' && <EsauritiTab {...cartoniData} />}
          {activeTab === 'carico' && <CaricoTab {...cartoniData} />}
          {activeTab === 'storico' && <StoricoTab storico={cartoniData.storico} />}
        </div>
      </div>

      <Toaster />
    </div>
  );
};

export default Index;