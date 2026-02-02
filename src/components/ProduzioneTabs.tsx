import React from 'react';
import { cn } from '@/lib/utils';
import { Factory, History, Settings } from 'lucide-react';

interface ProduzioneTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  counts: {
    macchine: number;
    lavori: number;
    storico: number;
  };
}

export function ProduzioneTabs({ activeTab, setActiveTab, counts }: ProduzioneTabsProps) {
  const tabs = [
    { id: 'stato-lavori', icon: <Factory className="h-4 w-4" />, label: 'Stato Lavori', count: counts.lavori },
    { id: 'storico-lavori', icon: <History className="h-4 w-4" />, label: 'Storico Lavori', count: counts.storico },
    { id: 'gestione-macchine', icon: <Settings className="h-4 w-4" />, label: 'Gestione Macchine', count: counts.macchine },
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
          data-tab={`produzione-${tab.id}`} // Prefisso per il colore
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.icon} 
          {tab.label}
          {tab.count !== undefined && <span className="tab-count text-xs">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}