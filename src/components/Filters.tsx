import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface FiltersProps {
  filtri: {
    codice?: string;
    fornitore?: string;
    tipologia?: string;
    formato?: string;
    grammatura?: string;
    cliente?: string;
    lavoro?: string;
    magazzino?: string;
    confermato?: string;
    numero_ordine?: string; // Aggiunto per ordini d'acquisto
    fornitore_nome?: string; // Aggiunto per ordini d'acquisto
    stato?: string; // Aggiunto per ordini d'acquisto
    data_ordine_filter?: string; // Nuovo filtro: data_ordine_filter
    fornitore_tipo?: string; // Nuovo filtro
  };
  onFilter: (filtri: any) => void;
  onReset: () => void;
  matchCount: number;
  sezione: string;
}

export function Filters({ filtri, onFilter, onReset, matchCount, sezione }: FiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (field: string, value: string) => {
    const newFiltri = { ...filtri, [field]: value };
    onFilter(newFiltri);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4 sm:mb-5">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mb-3">
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 w-full sm:w-auto justify-between text-sm sm:text-base py-2 sm:py-2.5"
          >
            <span className="flex items-center gap-2">
              <i className="fas fa-sliders-h"></i> 
              {isOpen ? 'Nascondi Filtri' : 'Mostra Filtri'}
            </span>
            <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} ml-2`}></i>
          </Button>
        </CollapsibleTrigger>
        
        {Object.values(filtri).some(v => v) && (
          <Button
            onClick={onReset}
            variant="ghost"
            className="text-[hsl(var(--danger))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(0,100%,95%)] text-sm sm:text-base py-2 sm:py-2.5"
          >
            <i className="fas fa-times mr-2"></i> Azzera
          </Button>
        )}
      </div>

      {matchCount !== undefined && (
        <div className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mb-2">
          <i className="fas fa-info-circle mr-1"></i> 
          Risultati trovati: <strong>{matchCount}</strong>
        </div>
      )}

      <CollapsibleContent className="space-y-3 sm:space-y-4">
        <div className="bg-[hsl(210,40%,98%)] rounded-lg p-3 sm:p-4 border border-[hsl(var(--border))]">
          <div className="text-[hsl(var(--muted-foreground))] italic text-xs sm:text-sm mb-3 sm:mb-4 flex items-center gap-2">
            <i className="fas fa-info-circle"></i> Usa i filtri per restringere i risultati
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {sezione !== 'ordini-acquisto' && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                    <i className="fas fa-barcode"></i> Codice
                  </label>
                  <input
                    type="text"
                    value={filtri.codice || ''}
                    onChange={(e) => handleChange('codice', e.target.value)}
                    placeholder="CTN-001"
                    className="px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                    <i className="fas fa-truck"></i> Fornitore
                  </label>
                  <input
                    type="text"
                    value={filtri.fornitore || ''}
                    onChange={(e) => handleChange('fornitore', e.target.value)}
                    placeholder="Imballex"
                    className="px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                    <i className="fas fa-box"></i> Tipologia Cartone
                  </label>
                  <input
                    type="text"
                    value={filtri.tipologia || ''}
                    onChange={(e) => handleChange('tipologia', e.target.value)}
                    placeholder="Microonda"
                    className="px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                    <i className="fas fa-expand-arrows-alt"></i> Formato
                  </label>
                  <input
                    type="text"
                    value={filtri.formato || ''}
                    onChange={(e) => handleChange('formato', e.target.value)}
                    placeholder="120x80"
                    className="px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                    <i className="fas fa-weight-hanging"></i> Grammatura
                  </label>
                  <input
                    type="text"
                    value={filtri.grammatura || ''}
                    onChange={(e) => handleChange('grammatura', e.target.value)}
                    placeholder="400"
                    className="px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                    <i className="fas fa-user"></i> Cliente
                  </label>
                  <input
                    type="text"
                    value={filtri.cliente || ''}
                    onChange={(e) => handleChange('cliente', e.target.value)}
                    placeholder="Azienda XY"
                    className="px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                    <i className="fas fa-briefcase"></i> Lavoro
                  </label>
                  <input
                    type="text"
                    value={filtri.lavoro || ''}
                    onChange={(e) => handleChange('lavoro', e.target.value)}
                    placeholder="Progetto ABC"
                    className="px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                    <i className="fas fa-warehouse"></i> Magazzino
                  </label>
                  <input
                    type="text"
                    value={filtri.magazzino || ''}
                    onChange={(e) => handleChange('magazzino', e.target.value)}
                    placeholder="A1"
                    className="px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                  />
                </div>
              </>
            )}

            {sezione === 'ordini' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                  <i className="fas fa-check-circle"></i> Conferma Ordine
                </label>
                <input
                  type="text"
                  value={filtri.confermato || ''}
                  onChange={(e) => handleChange('confermato', e.target.value)}
                  placeholder="Cerca per conferma"
                  className="px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                />
              </div>
            )}

            {sezione === 'ordini-acquisto' && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                    <i className="fas fa-file-alt"></i> Numero Ordine
                  </label>
                  <input
                    type="text"
                    value={filtri.numero_ordine || ''}
                    onChange={(e) => handleChange('numero_ordine', e.target.value)}
                    placeholder="PO-2024-001"
                    className="px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                    <i className="fas fa-truck"></i> Fornitore
                  </label>
                  <input
                    type="text"
                    value={filtri.fornitore_nome || ''}
                    onChange={(e) => handleChange('fornitore_nome', e.target.value)}
                    placeholder="Fornitore XYZ"
                    className="px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                    <i className="fas fa-info-circle"></i> Stato
                  </label>
                  <select
                    value={filtri.stato || ''}
                    onChange={(e) => handleChange('stato', e.target.value)}
                    className="px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                  >
                    <option value="">Tutti</option>
                    <option value="in_attesa">In Attesa</option>
                    <option value="confermato">Confermato</option>
                    <option value="ricevuto">Ricevuto</option>
                    <option value="annullato">Annullato</option>
                  </select>
                </div>
                {/* Filtro Data Ordine (ora per anno o data esatta) */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                    <i className="fas fa-calendar-alt"></i> Data Ordine
                  </label>
                  <input
                    type="text" // Cambiato a text per permettere l'inserimento dell'anno
                    value={filtri.data_ordine_filter || ''}
                    onChange={(e) => handleChange('data_ordine_filter', e.target.value)}
                    placeholder="YYYY" // Placeholder per l'anno
                    className="px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                    <i className="fas fa-box-open"></i> Tipologia Fornitore
                  </label>
                  <select
                    value={filtri.fornitore_tipo || ''}
                    onChange={(e) => handleChange('fornitore_tipo', e.target.value)}
                    className="px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                  >
                    <option value="">Tutte</option>
                    <option value="Cartone">Cartone</option>
                    <option value="Inchiostro">Inchiostro</option>
                    <option value="Colla">Colla</option>
                    <option value="Altro">Altro</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}