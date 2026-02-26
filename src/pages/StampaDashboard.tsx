import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SummaryHeader } from '@/components/SummaryHeader';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MinusCircle, History, Palette, Calculator, FileText, Database, Printer } from 'lucide-react';
import { useChat } from '@/hooks/useChat';

export default function StampaDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [currentDateTime, setCurrentDateTime] = useState('');
  const { totalUnreadCount } = useChat(navigate); // Pass navigate here

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const date = now.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const time = now.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setCurrentDateTime(`${date} ${time}`);
    };

    updateDateTime(); // Set initial date and time
    const intervalId = setInterval(updateDateTime, 1000); // Update every second

    return () => clearInterval(intervalId); // Clean up the interval on component unmount
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(210,40%,96%)] flex items-center justify-center">
        <div className="text-lg text-[hsl(var(--muted-foreground))]">Caricamento...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se l'utente è un amministratore, reindirizzalo alla dashboard amministratore
  if (user.role === 'amministratore') {
    return <Navigate to="/summary" replace />;
  }

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <SummaryHeader />
      <div className="mx-auto p-3 sm:p-5 md:px-8 flex flex-col items-center justify-center pt-16 min-h-[calc(100vh-120px)] max-w-3xl">
        <h2 className="text-3xl sm:text-4xl font-bold text-[hsl(var(--foreground))] mb-2 sm:mb-3 text-center">
          Ciao, <span style={{ color: 'hsl(30, 100%, 50%)' }}>{user.username}</span>!
        </h2>
        <p className="text-base sm:text-lg text-[hsl(var(--muted-foreground))] mb-6 sm:mb-8 text-center">
          {currentDateTime}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full sm:w-3/4 md:w-3/4 mx-auto">
          <Button
            onClick={() => navigate('/scarico-magazzino-stampa')}
            size="lg"
            className="bg-[hsl(var(--danger))] hover:bg-[hsl(0,72%,40%)] text-white rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 h-20 sm:h-24 px-8 sm:px-12"
          >
            <MinusCircle className="h-6 w-6 sm:h-8 sm:w-8 text-white flex-shrink-0" />
            <span className="leading-none text-sm sm:text-base whitespace-nowrap">Scarico Magazzino</span>
          </Button>
          <Button
            onClick={() => navigate('/storico-stampa')}
            size="lg"
            className="bg-[hsl(var(--storico-color))] hover:bg-[hsl(37,93%,35%)] text-white rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 h-20 sm:h-24 px-8 sm:px-12"
          >
            <History className="h-6 w-6 sm:h-8 sm:w-8 text-white flex-shrink-0" />
            <span className="leading-none text-sm sm:text-base whitespace-nowrap">Storico Movimenti</span>
          </Button>
          <Button
            onClick={() => navigate('/consumo-colore')}
            size="lg"
            className="bg-[hsl(var(--colori-color))] hover:bg-[hsl(var(--colori-color-dark))] text-white rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 h-20 sm:h-24 px-8 sm:px-12"
          >
            <Palette className="h-6 w-6 sm:h-8 sm:w-8 text-white flex-shrink-0" />
            <span className="leading-none text-sm sm:text-base whitespace-nowrap">Magazzino Colore</span>
          </Button>
          <Button
            onClick={() => navigate('/consumo-colore?tab=colori-calcolo')}
            size="lg"
            className="bg-[hsl(var(--colori-color-dark))] hover:bg-[hsl(330,80%,28%)] text-white rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 h-20 sm:h-24 px-8 sm:px-12"
          >
            <Calculator className="h-6 w-6 sm:h-8 sm:w-8 text-white flex-shrink-0" />
            <span className="leading-none text-sm sm:text-base whitespace-nowrap">Calcolo Consumo</span>
          </Button>
          <Button
            onClick={() => navigate('/lavori-stampa')}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 h-20 sm:h-24 px-8 sm:px-12"
          >
            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-white flex-shrink-0" />
            <span className="leading-none text-sm sm:text-base whitespace-nowrap">Lavori Stampa</span>
          </Button>
          <Button
            onClick={() => navigate('/db-articoli-produzione')}
            size="lg"
            className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 h-20 sm:h-24 px-8 sm:px-12"
          >
            <Database className="h-6 w-6 sm:h-8 sm:w-8 text-white flex-shrink-0" />
            <span className="leading-none text-sm sm:text-base whitespace-nowrap">DB ARTICOLI</span>
          </Button>
          <Button
            onClick={() => navigate('/genera-documenti')}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 h-20 sm:h-24 px-8 sm:px-12"
          >
            <Printer className="h-6 w-6 sm:h-8 sm:w-8 text-white flex-shrink-0" />
            <span className="leading-none text-sm sm:text-base whitespace-nowrap">Genera Scheda / Etichette</span>
          </Button>
        </div>
      </div>
    </div>
  );
}