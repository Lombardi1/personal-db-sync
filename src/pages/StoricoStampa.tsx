import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { StoricoMovimento } from '@/types';
import { Header } from '@/components/Header';
import { TabellaStorico } from '@/components/tables/TabellaStorico';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import * as notifications from '@/utils/notifications';
import { esportaTabellaXLS, esportaTabellaPDF } from '@/utils/export';

export default function StoricoStampa() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [storicoStampa, setStoricoStampa] = useState<StoricoMovimento[]>([]);
  const [loadingStorico, setLoadingStorico] = useState(true);
  const [stampaUserIds, setStampaUserIds] = useState<string[]>([]);

  const fetchAndSubscribe = useCallback(async () => {
    if (!user?.id) {
      setLoadingStorico(false);
      return;
    }

    setLoadingStorico(true);
    let cleanupChannel: (() => void) | undefined;

    try {
      // 1. Get all 'stampa' user IDs
      const { data: usersWithStampaRole, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'stampa');

      if (roleError) throw roleError;

      const ids = usersWithStampaRole.map(u => u.user_id);
      setStampaUserIds(ids); // Store these IDs in state

      if (ids.length === 0) {
        setStoricoStampa([]);
        setLoadingStorico(false);
        return () => {}; // Return no-op cleanup
      }

      // 2. Fetch storico entries for these users
      const { data, error } = await supabase
        .from('storico')
        .select(`*, app_users(username)`)
        .in('user_id', ids) // Filter by array of IDs
        .order('data', { ascending: false });

      if (error) {
        throw error;
      }

      const storicoWithUsernames: StoricoMovimento[] = (data || []).map(mov => ({
        ...mov,
        username: mov.app_users?.username || 'Sconosciuto'
      }));
      setStoricoStampa(storicoWithUsernames);

      // 3. Setup real-time channel AFTER fetching IDs and initial data
      const filterString = `user_id=in.(${ids.join(',')})`;
      const storicoChannel = supabase
        .channel(`storico-stampa-changes`) // Generic channel name
        .on('postgres_changes', { event: '*', schema: 'public', table: 'storico', filter: filterString }, () => {
          console.log('Realtime change detected for stampa users. Reloading storico.');
          // Re-fetch data when a change occurs
          fetchAndSubscribe(); // Call itself to re-fetch everything
        })
        .subscribe();

      cleanupChannel = () => {
        supabase.removeChannel(storicoChannel);
      };

    } catch (error: any) {
      console.error('Errore caricamento storico stampa:', error);
      notifications.showError(`Errore nel caricamento dello storico: ${error.message}`);
    } finally {
      setLoadingStorico(false);
    }
    return cleanupChannel || (() => {}); // Return the cleanup function or a no-op
  }, [user?.id]); // Dependencies for useCallback

  useEffect(() => {
    if (!authLoading && user?.id) {
      let cleanup: (() => void) | undefined;
      fetchAndSubscribe().then(fn => {
        cleanup = fn;
      });
      return () => {
        cleanup && cleanup();
      };
    }
  }, [user?.id, authLoading, fetchAndSubscribe]);

  if (authLoading || loadingStorico) {
    return (
      <div className="min-h-screen bg-[hsl(210,40%,96%)] flex items-center justify-center">
        <div className="text-lg text-[hsl(var(--muted-foreground))]">Caricamento storico...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header
        title="Storico Movimenti Personale (Stampa)" // Titolo aggiornato
        activeTab="storico-stampa"
        showUsersButton={false}
      />
      <div className="max-w-[1400px] mx-auto p-3 sm:p-5 md:px-8">
        <div className="flex justify-end mb-4">
          <Button onClick={() => navigate('/stampa-dashboard')} variant="outline" size="sm" className="text-sm">
            <Home className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            Torna alla Dashboard
          </Button>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--storico-color))] mb-4 sm:mb-5 flex items-center gap-2">
          <i className="fas fa-history"></i> Storico Movimenti Personale (Stampa)
        </h2>

        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            onClick={() => esportaTabellaXLS('tab-storico-stampa', 'storico_personale_stampa.xlsx')}
            className="bg-[hsl(37,93%,85%)] text-[hsl(var(--storico-color))] hover:bg-[hsl(37,93%,75%)] text-sm py-2 px-3"
          >
            <i className="fas fa-file-excel mr-1 sm:mr-2"></i> <span className="hidden sm:inline">Esporta</span> XLS
          </Button>
          <Button
            onClick={() => esportaTabellaPDF('tab-storico-stampa', 'storico_personale_stampa.pdf', 'storico', storicoStampa)}
            className="bg-[hsl(37,93%,85%)] text-[hsl(var(--storico-color))] hover:bg-[hsl(37,93%,75%)] text-sm py-2 px-3"
          >
            <i className="fas fa-file-pdf mr-1 sm:mr-2"></i> <span className="hidden sm:inline">Esporta</span> PDF
          </Button>
        </div>

        {storicoStampa.length === 0 ? (
          <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))]">Nessun movimento registrato per gli utenti "Stampa".</p>
        ) : (
          <TabellaStorico storico={storicoStampa} tableId="tab-storico-stampa" />
        )}
      </div>
    </div>
  );
}