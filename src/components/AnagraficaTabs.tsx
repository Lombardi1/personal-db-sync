import React from 'react';
import { Building2 } from 'lucide-react'; // Importa l'icona Building2

interface AnagraficaTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function AnagraficaTabs({ activeTab, setActiveTab }: AnagraficaTabsProps) {
  const tabs = [
    { id: 'clienti', icon: 'fa-users', label: 'Clienti' },
    { id: 'fornitori', icon: 'fa-truck-moving', label: 'Fornitori' },
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
          {tab.lucideIcon ? tab.lucideIcon : <i className={`fas ${tab.icon}`}></i>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}