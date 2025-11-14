interface TabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  counts: {
    dashboard: number;
    ordini: number;
    esauriti: number;
    storico: number;
  };
}

export function Tabs({ activeTab, setActiveTab, counts }: TabsProps) {
  const tabs = [
    { id: 'dashboard', icon: 'fa-th-large', label: 'Giacenza', count: counts.dashboard },
    { id: 'ordini', icon: 'fa-truck', label: 'Ordini in arrivo', count: counts.ordini },
    { id: 'esauriti', icon: 'fa-archive', label: 'Esauriti', count: counts.esauriti },
    { id: 'carico', icon: 'fa-truck-loading', label: 'Carico Ordini' },
    { id: 'storico', icon: 'fa-history', label: 'Storico Globale' }
  ];

  return (
    <div className="tabs-container">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          data-tab={tab.id}
          onClick={() => setActiveTab(tab.id)}
        >
          <i className={`fas ${tab.icon}`}></i> 
          {tab.label}
          {tab.count !== undefined && <span className="tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}
