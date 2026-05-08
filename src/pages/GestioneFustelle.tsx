import { useState, useEffect } from 'react';
import { useFustelle } from '@/hooks/useFustelle';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { FustelleTabs } from '@/components/FustelleTabs';
import { Toaster } from '@/components/ui/sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { GiacenzaFustelleTab } from '@/components/tabs/GiacenzaFustelleTab';
import { CaricoFustellaTab } from '@/components/tabs/CaricoFustellaTab';

const GestioneFustelle = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isVisualizzatore } = useAuth();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'giacenza';

  const [activeTab, setActiveTab] = useState(initialTab);
  const fustelleData = useFustelle();

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

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header title="Gestione Magazzino Fustelle" activeTab="fustelle" showUsersButton={true} />
      <div className="mx-auto p-3 sm:p-5 md:px-8">
        <div className="flex justify-end mb-4">
          <Button onClick={() => navigate('/summary')} variant="outline" size="sm" className="text-sm">
            <Home className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            Torna alla Dashboard
          </Button>
        </div>

        <FustelleTabs
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (isVisualizzatore && tab === 'carico') return;
            setActiveTab(tab);
          }}
          counts={{ giacenza: fustelleData.fustelle.length }}
          isVisualizzatore={isVisualizzatore}
        />

        <div className="bg-white border border-[hsl(214,32%,91%)] rounded-b-lg rounded-tr-lg shadow-sm p-6">
          {activeTab === 'giacenza' && <GiacenzaFustelleTab {...fustelleData} />}
          {activeTab === 'carico' && !isVisualizzatore && <CaricoFustellaTab aggiungiFustella={fustelleData.aggiungiFustella} />}
          {activeTab === 'carico' && isVisualizzatore && (
            <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
              <i className="fas fa-lock text-3xl mb-3 block"></i>
              <p className="text-lg font-medium">Accesso non consentito</p>
              <p className="text-sm mt-1">Il tuo ruolo non permette di aggiungere nuovi elementi.</p>
            </div>
          )}
        </div>
      </div>
      <Toaster />
    </div>
  );
};

export default GestioneFustelle;
