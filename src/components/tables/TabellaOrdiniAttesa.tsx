import { useState } from 'react';
import { OrdineAttesa, Fornitore } from '@/types/fornitore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { esportaOrdineFornitore } from '@/utils/exportOrdineFornitore';
import { toast } from 'sonner';

interface TabellaOrdiniAttesaProps {
  ordini: OrdineAttesa[];
  fornitori: Fornitore[];
  onElimina: (codice: string) => Promise<{ error: any }>;
  onSpostaInArrivo: (codice: string, dataConsegna: string, confermato: boolean) => Promise<{ error: any }>;
}

// Dati cliente di esempio - questi andrebbero presi da una configurazione
const CLIENTE_DATA = {
  ragione_sociale: 'ARTI GRAFICHE LOMBARDI SRL',
  indirizzo: 'VIA S.ANTONIO, 51',
  cap: '25050',
  citta: 'PASSIRANO',
  provincia: 'BRESCIA',
  telefono: '030657152 - 0306577500',
  fax: '0306577262',
  email: 'info@aglombardi.it',
  piva: 'IT00320390172',
  codice_fiscale: 'IT00320390172',
  rea: 'BS N. 169198',
  banca_1: 'Banca Popolare di Sondrio - ag. Ospitaletto BS',
  banca_2: 'Banca Popolare di Bergamo - ag. Ospitaletto BS'
};

export function TabellaOrdiniAttesa({ ordini, fornitori, onElimina, onSpostaInArrivo }: TabellaOrdiniAttesaProps) {
  const [codiceElimina, setCodiceElimina] = useState<string | null>(null);
  const [modalSposta, setModalSposta] = useState<{ isOpen: boolean; codice: string }>({ isOpen: false, codice: '' });
  const [dataConsegna, setDataConsegna] = useState('');
  const [confermato, setConfermato] = useState(false);

  const trovaFornitore = (nomeFornitore: string) => {
    return fornitori.find(f => f.ragione_sociale === nomeFornitore);
  };

  const handleEsportaPDF = (ordine: OrdineAttesa) => {
    const fornitore = trovaFornitore(ordine.fornitore);
    if (!fornitore) {
      toast.error('Fornitore non trovato nell\'anagrafica');
      return;
    }
    esportaOrdineFornitore([ordine], fornitore, CLIENTE_DATA);
  };

  const handleSpostaConferma = async () => {
    if (!dataConsegna) {
      toast.error('Inserisci la data di consegna');
      return;
    }
    const { error } = await onSpostaInArrivo(modalSposta.codice, dataConsegna, confermato);
    if (!error) {
      setModalSposta({ isOpen: false, codice: '' });
      setDataConsegna('');
      setConfermato(false);
    }
  };

  if (ordini.length === 0) {
    return (
      <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
        <i className="fas fa-inbox text-4xl mb-3"></i>
        <p>Nessun ordine in attesa</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-[600px] rounded-md border">
        <table id="tab-ordini-attesa" className="w-full border-collapse">
          <thead className="sticky top-0 bg-[hsl(var(--carico-color))] text-white z-10">
            <tr>
              <th className="border border-[hsl(var(--border))] px-3 py-2 text-left">Codice</th>
              <th className="border border-[hsl(var(--border))] px-3 py-2 text-left">Fornitore</th>
              <th className="border border-[hsl(var(--border))] px-3 py-2 text-left">N° Ordine</th>
              <th className="border border-[hsl(var(--border))] px-3 py-2 text-left">Tipologia</th>
              <th className="border border-[hsl(var(--border))] px-3 py-2 text-left">Formato</th>
              <th className="border border-[hsl(var(--border))] px-3 py-2 text-left">Grammatura</th>
              <th className="border border-[hsl(var(--border))] px-3 py-2 text-left">Fogli</th>
              <th className="border border-[hsl(var(--border))] px-3 py-2 text-left">Cliente</th>
              <th className="border border-[hsl(var(--border))] px-3 py-2 text-left">Prezzo €/kg</th>
              <th className="border border-[hsl(var(--border))] px-3 py-2 text-left">Data Prevista</th>
              <th className="border border-[hsl(var(--border))] px-3 py-2 text-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {ordini.map((ordine, idx) => (
              <tr key={ordine.codice} className={idx % 2 === 0 ? 'bg-white' : 'bg-[hsl(210,40%,98%)]'}>
                <td className="border border-[hsl(var(--border))] px-3 py-2 font-mono font-bold">{ordine.codice}</td>
                <td className="border border-[hsl(var(--border))] px-3 py-2">{ordine.fornitore}</td>
                <td className="border border-[hsl(var(--border))] px-3 py-2">{ordine.ordine}</td>
                <td className="border border-[hsl(var(--border))] px-3 py-2">{ordine.tipologia}</td>
                <td className="border border-[hsl(var(--border))] px-3 py-2">{ordine.formato}</td>
                <td className="border border-[hsl(var(--border))] px-3 py-2">{ordine.grammatura}</td>
                <td className="border border-[hsl(var(--border))] px-3 py-2 text-right font-semibold">{ordine.fogli}</td>
                <td className="border border-[hsl(var(--border))] px-3 py-2">{ordine.cliente}</td>
                <td className="border border-[hsl(var(--border))] px-3 py-2 text-right">€ {ordine.prezzo.toFixed(2)}</td>
                <td className="border border-[hsl(var(--border))] px-3 py-2">{ordine.data_consegna || '-'}</td>
                <td className="border border-[hsl(var(--border))] px-3 py-2">
                  <div className="flex gap-2 justify-center flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEsportaPDF(ordine)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                      title="Esporta PDF ordine"
                    >
                      <i className="fas fa-file-pdf"></i>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setModalSposta({ isOpen: true, codice: ordine.codice })}
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                      title="Sposta in Ordini in Arrivo"
                    >
                      <i className="fas fa-arrow-right"></i>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setCodiceElimina(ordine.codice)}
                      title="Elimina ordine"
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

      <AlertDialog open={!!codiceElimina} onOpenChange={() => setCodiceElimina(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare l'ordine <strong>{codiceElimina}</strong>?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (codiceElimina) {
                  await onElimina(codiceElimina);
                  setCodiceElimina(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={modalSposta.isOpen} onOpenChange={() => setModalSposta({ isOpen: false, codice: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sposta in Ordini in Arrivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="data_consegna">Data Consegna *</Label>
              <Input
                id="data_consegna"
                type="date"
                value={dataConsegna}
                onChange={(e) => setDataConsegna(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="confermato"
                checked={confermato}
                onCheckedChange={(checked) => setConfermato(checked as boolean)}
              />
              <Label htmlFor="confermato">Ordine confermato dal fornitore</Label>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setModalSposta({ isOpen: false, codice: '' })}>
              Annulla
            </Button>
            <Button onClick={handleSpostaConferma}>
              <i className="fas fa-check mr-2"></i>
              Conferma
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
