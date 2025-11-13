import { useState } from 'react';
import { useCartoni } from '@/hooks/useCartoni';
import { Header } from '@/components/Header';
import { Tabs } from '@/components/Tabs';
import { GiacenzaTab } from '@/components/tabs/GiacenzaTab';
import { OrdiniTab } from '@/components/tabs/OrdiniTab';
import { EsauritiTab } from '@/components/tabs/EsauritiTab';
import { CaricoTab } from '@/components/tabs/CaricoTab';
import { StoricoTab } from '@/components/tabs/StoricoTab';
import { Toaster } from '@/components/ui/sonner';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const cartoniData = useCartoni();

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header activeTab={activeTab} />
      
      <div className="mx-auto p-5 px-8">
        <Tabs 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          counts={{
            dashboard: cartoniData.giacenza.length,
            ordini: cartoniData.ordini.length,
            esauriti: cartoniData.esauriti.length,
            storico: cartoniData.storico.length
          }}
        />

        <div className="bg-white border border-[hsl(214,32%,91%)] rounded-b-lg rounded-tr-lg shadow-sm p-6">
          {activeTab === 'dashboard' && <GiacenzaTab {...cartoniData} />}
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
