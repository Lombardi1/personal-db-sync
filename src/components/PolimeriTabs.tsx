import { Layers, Plus, Database } from 'lucide-react';

interface PolimeriTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  counts: {
    giacenza: number;
    database?: number;
  };
}

export function PolimeriTabs({ activeTab, setActiveTab, counts }: PolimeriTabsProps) {
  const tabs = [
    { id: 'giacenza', label: 'Giacenza', icon: Layers, count: counts.giacenza },
    { id: 'carico', label: 'Carico Polimero', icon: Plus, count: null },
    { id: 'database', label: 'DB Polimeri', icon: Database, count: counts.database ?? null },
  ];

  return (
    <div className="flex border-b border-[hsl(214,32%,91%)] overflow-x-auto">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? 'border-blue-500 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
            {tab.count !== null && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
