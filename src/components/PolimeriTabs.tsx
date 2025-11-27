import React from 'react';
import { cn } from '@/lib/utils';

interface PolimeriTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  counts: {
    giacenza: number;
    storico: number;
  };
}

export function PolimeriTabs({ activeTab, setActiveTab, counts }: PolimeriTabsProps) {
  const tabs = [
    { id: 'giacenza', icon: 'fa-layer-group', label: 'Giacenza', count: counts.giacenza },
    { id: 'carico', icon: 'fa-plus-square', label: 'Carico Polimero' },
    { id: 'storico', icon: 'fa-history', label: 'Storico Polimeri', count: counts.storico }
  ];

  return (
    <div className="tabs-container">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={cn(
            "tab-btn text-sm sm:text-base py-3 px-3 sm:py-4 sm:px-5",
            activeTab === tab.id ? 'active' : ''
          )}
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