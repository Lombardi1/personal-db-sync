import React, { useState, useEffect } from 'react';
import { StoricoLavoroProduzione } from '@/types';
import { Button } from '@/components/ui/button';
import { History, Loader2 } from 'lucide-react';
import { TabellaStoricoLavori } from '@/components/tables/TabellaStoricoLavori';
import { esportaTabellaXLS, esportaTabellaPDF } from '@/utils/export'; // Assicurati che queste funzioni supportino i nuovi tipi

interface StoricoLavoriTabProps {
  storicoLavori: StoricoLavoroProduzione[];
  loading: boolean;
}

export function StoricoLavoriTab({ storicoLavori, loading }: StoricoLavoriTabProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--produzione-color))] flex items-center gap-2 mb-4">
        <History className="h-6 w-6" /> Storico Lavori di Produzione
      </h3>
      <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))] mb-4">
        Visualizza lo storico completo di tutti i lavori di produzione, inclusi i cambiamenti di stato e le modifiche.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          onClick={() => alert('Funzionalità di esportazione XLS in costruzione.')}
          className="bg-[hsl(var(--produzione-color))] text-white hover:bg-[hsl(var(--produzione-color-dark))] text-sm py-2 px-3"
        >
          <i className="fas fa-file-excel mr-1 sm:mr-2"></i> <span className="hidden sm:inline">Esporta</span> XLS
        </Button>
        <Button
          onClick={() => alert('Funzionalità di esportazione PDF in costruzione.')}
          className="bg-[hsl(var(--produzione-color))] text-white hover:bg-[hsl(var(--produzione-color-dark))] text-sm py-2 px-3"
        >
          <i className="fas fa-file-pdf mr-1 sm:mr-2"></i> <span className="hidden sm:inline">Esporta</span> PDF
        </Button>
      </div>

      {storicoLavori.length === 0 ? (
        <p className="text-center text-sm sm:text-base text-[hsl(var(--muted-foreground))] py-6 sm:py-8">
          Nessun movimento di lavoro registrato.
        </p>
      ) : (
        <TabellaStoricoLavori storicoLavori={storicoLavori} />
      )}
    </div>
  );
}