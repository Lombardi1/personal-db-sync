import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SummaryHeader } from '@/components/SummaryHeader';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Warehouse, Shapes, Layers, Factory, Palette,
  Calculator, FileText, Database, Printer, PackageOpen, ChevronRight
} from 'lucide-react';
import { useCartoni } from '@/hooks/useCartoni';
import { useChat } from '@/hooks/useChat';

interface SubItem {
  label: string;
  route: string;
  icon: React.ReactNode;
  color: string;
}

interface MacroCard {
  title: string;
  icon: React.ReactNode;
  gradient: string;
  borderColor: string;
  titleColor: string;
  items: SubItem[];
}

export default function Summary() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentDateTime, setCurrentDateTime] = useState('');
  const { loading: cartoniLoading } = useCartoni();
  const { totalUnreadCount } = useChat(navigate);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const date = now.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const time = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      setCurrentDateTime(`${date} ${time}`);
    };
    updateDateTime();
    const id = setInterval(updateDateTime, 1000);
    return () => clearInterval(id);
  }, []);

  if (authLoading || cartoniLoading) {
    return (
      <div className="min-h-screen bg-[hsl(210,40%,96%)] flex items-center justify-center">
        <div className="text-lg text-[hsl(var(--muted-foreground))]">Caricamento...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'stampa') return <Navigate to="/stampa-dashboard" replace />;

  const macroCards: MacroCard[] = [
    {
      title: 'MAGAZZINI',
      icon: <Warehouse className="h-10 w-10" />,
      gradient: 'from-blue-600 to-blue-800',
      borderColor: 'border-blue-300',
      titleColor: 'text-blue-700',
      items: [
        { label: 'Magazzino Cartoni', route: '/gestione-magazzino', icon: <Warehouse className="h-5 w-5" />, color: 'bg-blue-500 hover:bg-blue-600' },
        { label: 'Magazzino Fustelle', route: '/gestione-fustelle', icon: <Shapes className="h-5 w-5" />, color: 'bg-indigo-500 hover:bg-indigo-600' },
        { label: 'Magazzino Polimeri', route: '/gestione-polimeri', icon: <Layers className="h-5 w-5" />, color: 'bg-violet-500 hover:bg-violet-600' },
        { label: 'Magazzino Colore', route: '/consumo-colore', icon: <Palette className="h-5 w-5" />, color: 'bg-pink-500 hover:bg-pink-600' },
      ],
    },
    {
      title: 'PRODUZIONE / LAVORI',
      icon: <Factory className="h-10 w-10" />,
      gradient: 'from-orange-500 to-orange-700',
      borderColor: 'border-orange-300',
      titleColor: 'text-orange-700',
      items: [
        { label: 'Lavori Stampa', route: '/lavori-stampa', icon: <FileText className="h-5 w-5" />, color: 'bg-purple-500 hover:bg-purple-600' },
        { label: 'DB Articoli Produzione', route: '/db-articoli-produzione', icon: <Database className="h-5 w-5" />, color: 'bg-orange-500 hover:bg-orange-600' },
        { label: 'Gestione Produzione', route: '/produzione-dashboard', icon: <Factory className="h-5 w-5" />, color: 'bg-amber-600 hover:bg-amber-700' },
        { label: 'Genera Scheda / Etichette', route: '/genera-documenti', icon: <Printer className="h-5 w-5" />, color: 'bg-green-600 hover:bg-green-700' },
      ],
    },
    {
      title: 'ORDINI',
      icon: <ShoppingCart className="h-10 w-10" />,
      gradient: 'from-teal-500 to-teal-700',
      borderColor: 'border-teal-300',
      titleColor: 'text-teal-700',
      items: [
        { label: "Ordini d'Acquisto", route: '/ordini-acquisto', icon: <ShoppingCart className="h-5 w-5" />, color: 'bg-teal-500 hover:bg-teal-600' },
        { label: 'Ordini Cartone', route: '/ordini-cartone', icon: <PackageOpen className="h-5 w-5" />, color: 'bg-cyan-600 hover:bg-cyan-700' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <SummaryHeader />
      <div className="mx-auto p-4 sm:p-6 md:px-10 pt-10 max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-[hsl(var(--foreground))] mb-2">
            Ciao, <span style={{ color: 'hsl(30, 100%, 50%)' }}>{user.username}</span>!
          </h2>
          <p className="text-lg text-[hsl(var(--muted-foreground))]">{currentDateTime}</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {macroCards.map((card) => (
            <div key={card.title} className={`bg-white rounded-2xl shadow-lg border-2 ${card.borderColor} overflow-hidden`}>
              <div className={`bg-gradient-to-r ${card.gradient} px-6 py-5 flex items-center gap-4`}>
                <div className="text-white opacity-90">{card.icon}</div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-wide">{card.title}</h3>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {card.items.map((item) => (
                  <button
                    key={item.route}
                    onClick={() => navigate(item.route)}
                    className={`${item.color} text-white rounded-xl px-4 py-4 flex items-center gap-3 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] text-left group`}
                  >
                    <span className="opacity-90 flex-shrink-0">{item.icon}</span>
                    <span className="font-semibold text-sm sm:text-base flex-1 leading-tight">{item.label}</span>
                    <ChevronRight className="h-4 w-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
