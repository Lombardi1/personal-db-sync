interface CaricoTabProps {
  aggiungiOrdine: any;
}

export function CaricoTab({ aggiungiOrdine }: CaricoTabProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-[hsl(var(--carico-color))] mb-5 flex items-center gap-2">
        <i className="fas fa-truck-loading"></i> Carico Ordini
      </h2>
      <p className="text-[hsl(var(--muted-foreground))]">
        Form per caricare nuovi ordini in arrivo. Tab completo in sviluppo...
      </p>
    </div>
  );
}
