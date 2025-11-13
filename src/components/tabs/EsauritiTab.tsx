interface EsauritiTabProps {
  esauriti: any[];
  riportaInGiacenza: any;
}

export function EsauritiTab({ esauriti }: EsauritiTabProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-[hsl(var(--esauriti-color))] mb-5 flex items-center gap-2">
        <i className="fas fa-archive"></i> Cartoni Esauriti
      </h2>
      <p className="text-[hsl(var(--muted-foreground))]">
        Hai {esauriti?.length || 0} cartoni esauriti. Tab completo in sviluppo...
      </p>
    </div>
  );
}
