import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { AziendaTab } from '@/components/tabs/AziendaTab';
import { useAziendaInfo } from '@/hooks/useAziendaInfo';

export default function AziendaInfoPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { aziendaInfo, loading: aziendaInfoLoading, updateAziendaInfo } = useAziendaInfo();

  if (authLoading || aziendaInfoLoading) {
    return (
      <div className="min-h-screen bg-[hsl(210,40%,96%)] flex items-center justify-center">
        <div className="text-lg text-[hsl(var(--muted-foreground))]">Caricamento informazioni azienda...</div>
      </div>
    );
  }

  if (!user || user.role !== 'amministratore') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header
        title="Gestione Informazioni Azienda"
        activeTab="azienda-info" // Nuovo activeTab per il colore dell'header
        showUsersButton={true}
      />
      <div className="max-w-[1400px] mx-auto p-3 sm:p-5 md:px-8">
        <div className="flex justify-end mb-4">
          <Button onClick={() => navigate('/summary')} variant="outline" size="sm" className="text-sm">
            <Home className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            Torna alla Dashboard
          </Button>
        </div>

        <div className="bg-white border border-[hsl(214,32%,91%)] rounded-lg shadow-sm p-4 sm:p-6">
          <AziendaTab
            aziendaInfo={aziendaInfo}
            updateAziendaInfo={updateAziendaInfo}
          />
        </div>
      </div>
    </div>
  );
}