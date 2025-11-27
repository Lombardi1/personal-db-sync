import React from 'react';
import { cn } from '@/lib/utils';

interface FustelleTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  counts: {
    giacenza: number;
    // Rimosso: storico: number;
  };
}

export function FustelleTabs({ activeTab, setActiveTab, counts }: FustelleTabsProps) {
  const tabs = [
    { id: 'giacenza', icon: 'fa-shapes', label: 'Giacenza', count: counts.giacenza },
    { id: 'carico', icon: 'fa-plus-square', label: 'Carico Fustella' },
    // Rimosso: { id: 'storico', icon: 'fa-history', label: 'Storico Fustelle', count: counts.storico }
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