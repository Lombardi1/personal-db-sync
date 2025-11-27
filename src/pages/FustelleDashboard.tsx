import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, Shapes } from 'lucide-react';
import { Header } from '@/components/Header';

export default function FustelleDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header
        title="Gestione Magazzino Fustelle"
        activeTab="fustelle"
        showUsersButton={true}
      />
      <div className="max-w-[1400px] mx-auto p-3 sm:p-5 md:px-8">
        <div className="flex justify-end mb-4">
          <Button onClick={() => navigate('/summary')} variant="outline" size="sm" className="text-sm">
            <Home className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            Torna alla Dashboard
          </Button>
        </div>

        <div className="bg-white border border-[hsl(214,32%,91%)] rounded-lg shadow-sm p-6 sm:p-8 text-center">
          <Shapes className="h-16 w-16 sm:h-20 sm:w-20 text-[hsl(var(--fustelle-color))] mx-auto mb-6" />
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--fustelle-color))] mb-4">
            Magazzino Fustelle
          </h2>
          <p className="text-base sm:text-lg text-[hsl(var(--muted-foreground))] mb-6">
            Questa sezione è in costruzione. Presto potrai gestire qui le tue fustelle!
          </p>
          <Button onClick={() => navigate('/summary')} className="bg-[hsl(var(--fustelle-color))] hover:bg-[hsl(var(--fustelle-color-dark))] text-white">
            Torna alla Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}