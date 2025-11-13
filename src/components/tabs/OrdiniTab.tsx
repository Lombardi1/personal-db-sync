interface OrdiniTabProps {
  ordini: any[];
  spostaInGiacenza: any;
  confermaOrdine: any;
  eliminaOrdine: any;
  modificaOrdine: any;
}

export function OrdiniTab({ ordini }: OrdiniTabProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-[hsl(var(--ordini-color))] mb-5 flex items-center gap-2">
        <i className="fas fa-truck"></i> Ordini in arrivo
      </h2>
      <p className="text-[hsl(var(--muted-foreground))]">
        Hai {ordini?.length || 0} ordini in arrivo. Tab completo in sviluppo...
      </p>
    </div>
  );
}
