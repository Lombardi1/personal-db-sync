import { StoricoMovimento } from '@/types';
import { TabellaStorico } from '@/components/tables/TabellaStorico';
import { Button } from '@/components/ui/button'; // Import Button

interface StoricoTabProps {
  storico: StoricoMovimento[];
}

export function StoricoTab({ storico }: StoricoTabProps) {
  console.log("StoricoTab: Received storico prop:", storico); // Log di debug
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold mb-4">Storico Globale</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        {/* Pulsante Esporta XLS rimosso */}
        {/* Pulsante Esporta PDF rimosso */}
      </div>
      {storico.length === 0 ? (
        <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))]">Nessun movimento registrato.</p>
      ) : (
        <TabellaStorico storico={storico} />
      )}
    </div>
  );
}