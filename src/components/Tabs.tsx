interface TabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  counts: {
    giacenza: number;
    ordini: number;
    esauriti: number;
    storico: number;
  };
}

export function Tabs({ activeTab, setActiveTab, counts }: TabsProps) {
  const tabs = [
    // Rimosso: { id: 'riepilogo', icon: 'fa-home', label: 'Riepilogo' },
    { id: 'giacenza', icon: 'fa-th-large', label: 'Giacenza', count: counts.giacenza },
    { id: 'ordini', icon: 'fa-truck', label: 'Ordini in arrivo', count: counts.ordini },
    { id: 'esauriti', icon: 'fa-archive', label: 'Esauriti', count: counts.esauriti },
    { id: 'carico', icon: 'fa-truck-loading', label: 'Carico Ordini' },
    { id: 'storico', icon: 'fa-history', label: 'Storico Globale', count: counts.storico }
  ];

  return (
    <div className="tabs-container">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-btn text-sm sm:text-base py-3 px-3 sm:py-4 sm:px-5 ${activeTab === tab.id ? 'active' : ''}`}
          data-tab={tab.id}
          onClick={() => setActiveTab(tab.id)}
        >
          <i className={`fas ${tab.icon}`}></i> 
          {tab.label}
          {tab.count !== undefined && <span className="tab-count text-xs">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}