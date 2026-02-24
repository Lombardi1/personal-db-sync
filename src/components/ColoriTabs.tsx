import React from 'react';
import { cn } from '@/lib/utils';

interface ColoriTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  counts: {
    giacenza: number;
    storico: number;
  };
}

export function ColoriTabs({ activeTab, setActiveTab, counts }: ColoriTabsProps) {
  const tabs = [
    { id: 'colori-giacenza', label: 'Giacenza Colori', count: counts.giacenza, icon: 'fa-palette' },
    { id: 'colori-carico', label: 'Carico Colore', icon: 'fa-plus-square' },
    { id: 'colori-scarico', label: 'Scarico / Consumo', icon: 'fa-minus-square' },
    { id: 'colori-storico', label: 'Storico Movimenti', count: counts.storico, icon: 'fa-history' },
    { id: 'colori-calcolo', label: 'Calcolo Consumo', icon: 'fa-calculator' },
  ];

  return (
    <div className="tabs-container">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={cn(
            'tab-btn text-sm sm:text-base py-3 px-3 sm:py-4 sm:px-5',
            activeTab === tab.id ? 'active' : ''
          )}
          data-tab={tab.id}
          onClick={() => setActiveTab(tab.id)}
        >
          <i className={`fas ${tab.icon}`}></i>{' '}
          {tab.label}
          {tab.count !== undefined && (
            <span className="tab-count text-xs">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
