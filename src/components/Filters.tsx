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
  };
  onFilter: (filtri: any) => void;
  onReset: () => void;
  matchCount: number;
  sezione: string;
}

export function Filters({ filtri, onFilter, onReset, matchCount, sezione }: FiltersProps) {
  const handleChange = (field: string, value: string) => {
    const newFiltri = { ...filtri, [field]: value };
    onFilter(newFiltri);
  };

  return (
    <div className="filters">
      <div className="font-semibold mb-3 text-[hsl(var(--primary))] flex items-center gap-2">
        <i className="fas fa-sliders-h"></i> Filtra per:
      </div>
      <div className="text-[hsl(var(--muted-foreground))] italic text-sm mb-3 flex items-center gap-2">
        <i className="fas fa-info-circle"></i> Usa i filtri per restringere i risultati
      </div>

      <div className="filters-grid">
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
            placeholder="Alpha"
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
            placeholder="LAV-2025"
            className="px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium flex items-center gap-1">
            <i className="fas fa-map-marker-alt"></i> Magazzino
          </label>
          <input
            type="text"
            value={filtri.magazzino}
            onChange={(e) => handleChange('magazzino', e.target.value)}
            placeholder="Mag. B"
            className="px-3 py-2 border border-[hsl(var(--border))] rounded-md text-sm focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/10"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onFilter(filtri)}
          className="px-4 py-2 bg-[hsl(217,91%,88%)] text-[hsl(var(--primary-dark))] rounded-md font-semibold text-sm hover:bg-[hsl(217,91%,78%)] transition-colors flex items-center gap-2"
        >
          <i className="fas fa-search"></i> Applica
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-[hsl(210,40%,96%)] text-[hsl(var(--muted-foreground))] rounded-md font-semibold text-sm hover:bg-[hsl(214,32%,91%)] transition-colors flex items-center gap-2"
        >
          <i className="fas fa-redo"></i> Reset
        </button>
        <span className="text-[hsl(var(--muted-foreground))] text-sm flex items-center ml-auto">
          {matchCount} risultati trovati
        </span>
      </div>
    </div>
  );
}
