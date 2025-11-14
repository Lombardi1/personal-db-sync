import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface FiltersProps {
  filtri: {
    codice: string;
    fornitore: string;
    tipologia: string;
    formato: string;
    grammatura: string;
    cliente: string;
    lavoro: string;
    magazzino: string;
    confermato?: string;
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
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-5">
      <div className="flex items-center justify-between gap-4 mb-3">
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 w-full md:w-auto justify-between"
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
            className="text-[hsl(var(--danger))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(0,100%,95%)]"
          >
            <i className="fas fa-times mr-2"></i> Azzera
          </Button>
        )}
      </div>

      {matchCount !== undefined && (
        <div className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
          <i className="fas fa-info-circle mr-1"></i> 
          Risultati trovati: <strong>{matchCount}</strong>
        </div>
      )}

      <CollapsibleContent className="space-y-4">
        <div className="bg-[hsl(210,40%,98%)] rounded-lg p-4 border border-[hsl(var(--border))]">
          <div className="text-[hsl(var(--muted-foreground))] italic text-sm mb-4 flex items-center gap-2">
            <i className="fas fa-info-circle"></i> Usa i filtri per restringere i risultati
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium flex items-center gap-1">
                <i className="fas fa-barcode"></i> Codice
              </label>
              <input
                type="text"
                value={filtri.codice}
                onChange={(e) => handleChange('codice', e.target.value)}
                placeholder="CTN-001"
                className="px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium flex items-center gap-1">
                <i className="fas fa-truck"></i> Fornitore
              </label>
              <input
                type="text"
                value={filtri.fornitore}
                onChange={(e) => handleChange('fornitore', e.target.value)}
                placeholder="Imballex"
                className="px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium flex items-center gap-1">
                <i className="fas fa-box"></i> Tipologia Cartone
              </label>
              <input
                type="text"
                value={filtri.tipologia}
                onChange={(e) => handleChange('tipologia', e.target.value)}
                placeholder="Microonda"
                className="px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium flex items-center gap-1">
                <i className="fas fa-expand-arrows-alt"></i> Formato
              </label>
              <input
                type="text"
                value={filtri.formato}
                onChange={(e) => handleChange('formato', e.target.value)}
                placeholder="120x80"
                className="px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium flex items-center gap-1">
                <i className="fas fa-weight-hanging"></i> Grammatura
              </label>
              <input
                type="text"
                value={filtri.grammatura}
                onChange={(e) => handleChange('grammatura', e.target.value)}
                placeholder="400"
                className="px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium flex items-center gap-1">
                <i className="fas fa-user"></i> Cliente
              </label>
              <input
                type="text"
                value={filtri.cliente}
                onChange={(e) => handleChange('cliente', e.target.value)}
                placeholder="Azienda XY"
                className="px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium flex items-center gap-1">
                <i className="fas fa-briefcase"></i> Lavoro
              </label>
              <input
                type="text"
                value={filtri.lavoro}
                onChange={(e) => handleChange('lavoro', e.target.value)}
                placeholder="Progetto ABC"
                className="px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium flex items-center gap-1">
                <i className="fas fa-warehouse"></i> Magazzino
              </label>
              <input
                type="text"
                value={filtri.magazzino}
                onChange={(e) => handleChange('magazzino', e.target.value)}
                placeholder="A1"
                className="px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
              />
            </div>

            {sezione === 'ordini' && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium flex items-center gap-1">
                  <i className="fas fa-check-circle"></i> Conferma Ordine
                </label>
                <select
                  value={filtri.confermato || ''}
                  onChange={(e) => handleChange('confermato', e.target.value)}
                  className="px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
                >
                  <option value="">Tutti</option>
                  <option value="true">Confermati</option>
                  <option value="false">Non confermati</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
