import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SummaryHeader } from '@/components/SummaryHeader';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Warehouse, Shapes, Layers } from 'lucide-react';
import { useCartoni } from '@/hooks/useCartoni';
import React from 'react';

export default function Summary() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentDateTime, setCurrentDateTime] = useState('');
  const { loading: cartoniLoading } = useCartoni();

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

    updateDateTime();
    const intervalId = setInterval(updateDateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  if (authLoading || cartoniLoading) {
    return (
      <div className="min-h-screen bg-[hsl(210,40%,96%)] flex items-center justify-center">
        <div className="text-lg text-[hsl(var(--muted-foreground))]">Caricamento...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'stampa') {
    return <Navigate to="/stampa-dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <SummaryHeader />
      <div className="mx-auto p-3 sm:p-5 md:px-8 flex flex-col items-center justify-center pt-16 min-h-[calc(100vh-100px)] max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-[hsl(var(--foreground))] mb-3 sm:mb-4 text-center">
          Ciao, <span style={{ color: 'hsl(30, 100%, 50%)' }}>{user.username}</span>!
        </h2>
        <p className="text-xl sm:text-2xl text-[hsl(var(--muted-foreground))] mb-8 sm:mb-10 text-center">
          {currentDateTime}
        </p>
        {user.role === 'amministratore' && (
          <div className="grid grid-cols-1 gap-8 w-full">
            {/* Sezione Bottoni */}
            <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Button 
                onClick={() => navigate('/gestione-magazzino')} 
                size="lg" 
                className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-dark))] text-white rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-3 sm:gap-4 text-sm sm:text-base py-3 sm:py-4 h-auto text-center"
              >
                <Warehouse className="h-6 w-6 sm:h-8 sm:w-8 text-white leading-none" />
                <span className="leading-none">Gestione Magazzino Cartoni</span>
              </Button>
              <Button 
                onClick={() => navigate('/ordini-acquisto')} 
                size="lg" 
                className="bg-[hsl(var(--ordini-acquisto-color))] hover:bg-[hsl(var(--ordini-acquisto-color-dark))] text-white rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-3 sm:gap-4 text-sm sm:text-base py-3 sm:py-4 h-auto text-center"
              >
                <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-white leading-none" />
                <span className="leading-none">Ordini d'Acquisto</span>
              </Button>
              <Button 
                onClick={() => navigate('/gestione-fustelle')} 
                size="lg" 
                className="bg-[hsl(var(--fustelle-color))] hover:bg-[hsl(var(--fustelle-color-dark))] text-white rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-3 sm:gap-4 text-sm sm:text-base py-3 sm:py-4 h-auto text-center"
              >
                <Shapes className="h-6 w-6 sm:h-8 sm:w-8 text-white leading-none" />
                <span className="leading-none">Gestione Magazzino Fustelle</span>
              </Button>
              <Button 
                onClick={() => navigate('/gestione-polimeri')} 
                size="lg" 
                className="bg-[hsl(var(--polimeri-color))] hover:bg-[hsl(var(--polimeri-color-dark))] text-white rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-3 sm:gap-4 text-sm sm:text-base py-3 sm:py-4 h-auto text-center"
              >
                <Layers className="h-6 w-6 sm:h-8 sm:w-8 text-white leading-none" />
                <span className="leading-none">Gestione Magazzino Polimeri</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}