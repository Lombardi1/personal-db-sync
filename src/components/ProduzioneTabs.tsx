import { BarChart2, Clock, Settings, CalendarDays } from 'lucide-react';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  counts: {
    macchine: number;
    lavori: number;
    storico: number;
    programmi?: number;
  };
}

const TABS = [
  { key: 'programma-stampa', label: 'Programma Stampa', icon: CalendarDays },
  { key: 'stato-lavori',     label: 'Stato Lavori',     icon: BarChart2 },
  { key: 'storico-lavori',   label: 'Storico Lavori',   icon: Clock },
  { key: 'gestione-macchine',label: 'Gestione Macchine',icon: Settings },
];

export function ProduzioneTabs({ activeTab, setActiveTab, counts }: Props) {
  const getCount = (key: string) => {
    if (key === 'stato-lavori') return counts.lavori;
    if (key === 'storico-lavori') return counts.storico;
    if (key === 'gestione-macchine') return counts.macchine;
    if (key === 'programma-stampa') return counts.programmi ?? null;
    return null;
  };

  return (
    <div className="flex border-b border-[hsl(214,32%,91%)] overflow-x-auto">
      {TABS.map(tab => {
        const Icon = tab.icon;
        const count = getCount(tab.key);
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              isActive
                ? 'border-[hsl(var(--produzione-color))] text-[hsl(var(--produzione-color))] bg-white'
                : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(214,32%,91%)]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
            {count !== null && (
              <span className={`ml-1 text-xs rounded-full px-1.5 py-0.5 ${
                isActive ? 'bg-[hsl(var(--produzione-color))] text-white' : 'bg-gray-100 text-gray-500'
              }`}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
