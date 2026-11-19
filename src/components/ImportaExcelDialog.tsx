import { useRef, useState } from 'react';
import { FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { leggiExcel, TabellaExcel } from '@/utils/excelSync';

interface Props {
  tabella: TabellaExcel;
  onDone?: () => void;
}

interface Anteprima {
  righe: Record<string, string | number>[];
  avvisi: string[];
  inserite: number;
  aggiornate?: number;
  eliminate: number;
  righeGestionale: number;
  bloccato?: string;
}

const TITOLI: Record<TabellaExcel, { nome: string; file: string }> = {
  lavori: { nome: 'Lavori Stampa', file: 'DB_Lavori_Stampa.xlsx' },
  articoli: { nome: 'DB Articoli', file: 'DB_Articoli.xlsm' },
};

async function chiamaSync(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('sync-excel', { body });
  if (error) {
    let j: any = null;
    try { j = await (error as any).context?.json?.(); } catch { /* ignora */ }
    return { ok: false as const, error: j?.error || error.message, blocked: !!j?.blocked };
  }
  return { ok: true as const, data };
}

export function ImportaExcelDialog({ tabella, onDone }: Props) {
  const { isAmministratore, isStampa } = useAuth();
  const [open, setOpen] = useState(false);
  const [fase, setFase] = useState<'scelta' | 'lettura' | 'anteprima' | 'invio' | 'fatto'>('scelta');
  const [errore, setErrore] = useState<string | null>(null);
  const [anteprima, setAnteprima] = useState<Anteprima | null>(null);
  const [nomeFile, setNomeFile] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const t = TITOLI[tabella];

  if (!isAmministratore && !isStampa) return null;

  const reset = () => {
    setFase('scelta');
    setErrore(null);
    setAnteprima(null);
    setNomeFile('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const apri = () => { reset(); setOpen(true); };

  const scegliFile = async (file: File | undefined) => {
    if (!file) return;
    setNomeFile(file.name);
    setErrore(null);
    setFase('lettura');
    try {
      const { righe, avvisi } = await leggiExcel(file, tabella);
      if (righe.length === 0) throw new Error('Non ho trovato nessuna riga valida nel file.');
      const r = await chiamaSync({ tabella, rows: righe, dry_run: true });
      if (!r.ok) {
        if (r.blocked) {
          setAnteprima({ righe, avvisi, inserite: 0, eliminate: 0, righeGestionale: 0, bloccato: r.error });
          setFase('anteprima');
          return;
        }
        throw new Error(r.error);
      }
      const d = r.data;
      setAnteprima({
        righe, avvisi,
        inserite: d.inserite ?? 0,
        aggiornate: d.aggiornate,
        eliminate: d.eliminate ?? 0,
        righeGestionale: d.righe_gestionale ?? 0,
      });
      setFase('anteprima');
    } catch (e) {
      setErrore((e as Error).message || 'Errore durante la lettura del file');
      setFase('scelta');
    }
  };

  const applica = async (force: boolean) => {
    if (!anteprima) return;
    setFase('invio');
    setErrore(null);
    const r = await chiamaSync({ tabella, rows: anteprima.righe, dry_run: false, force });
    if (!r.ok) {
      setErrore(r.error);
      setFase('anteprima');
      return;
    }
    setFase('fatto');
    toast.success(`${t.nome} aggiornati dall'Excel`);
    onDone?.();
  };

  const nessunaModifica = anteprima && !anteprima.bloccato
    && anteprima.inserite === 0 && (anteprima.aggiornate ?? 0) === 0 && anteprima.eliminate === 0;

  return (
    <>
      <Button variant="outline" size="sm" onClick={apri} className="gap-2">
        <FileSpreadsheet className="h-4 w-4" /> Aggiorna da Excel
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (fase !== 'invio') setOpen(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Aggiorna {t.nome} dall'Excel</DialogTitle>
            <DialogDescription>
              L'Excel comanda: il gestionale si allinea al file. Le modifiche fatte qui su questi dati e non presenti
              nell'Excel vengono sostituite.
            </DialogDescription>
          </DialogHeader>

          {(fase === 'scelta' || fase === 'lettura') && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Scegli il file <b>{t.file}</b> (dal server aziendale).</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xlsm"
                disabled={fase === 'lettura'}
                onChange={(e) => scegliFile(e.target.files?.[0])}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-white file:px-3 file:py-2 file:text-sm"
              />
              {fase === 'lettura' && (
                <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Leggo {nomeFile} e controllo le differenze…</div>
              )}
              {errore && <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />{errore}</div>}
            </div>
          )}

          {(fase === 'anteprima' || fase === 'invio') && anteprima && (
            <div className="space-y-3 text-sm">
              <div>File: <b>{nomeFile}</b> — {anteprima.righe.length.toLocaleString('it-IT')} righe valide (nel gestionale ora: {anteprima.righeGestionale ? anteprima.righeGestionale.toLocaleString('it-IT') : '—'})</div>
              {anteprima.bloccato ? (
                <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <b>Aggiornamento bloccato per sicurezza.</b>
                    <div className="mt-1">{anteprima.bloccato.replace('BLOCCATO: ', '')}</div>
                    <div className="mt-1">Controlla di aver scelto il file giusto e aggiornato.</div>
                  </div>
                </div>
              ) : nessunaModifica ? (
                <div className="flex gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-green-800"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />Il gestionale è già allineato all'Excel: nessuna modifica.</div>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md border p-3"><div className="text-2xl font-bold text-green-700">{anteprima.inserite.toLocaleString('it-IT')}</div>nuove</div>
                  <div className="rounded-md border p-3"><div className="text-2xl font-bold text-blue-700">{anteprima.aggiornate === undefined ? '—' : anteprima.aggiornate.toLocaleString('it-IT')}</div>modificate</div>
                  <div className="rounded-md border p-3"><div className="text-2xl font-bold text-red-700">{anteprima.eliminate.toLocaleString('it-IT')}</div>tolte</div>
                </div>
              )}
              {!anteprima.bloccato && !nessunaModifica && tabella === 'lavori' && (
                <p className="text-xs text-muted-foreground">Nei Lavori Stampa una riga modificata conta come "tolta" + "nuova", perché le righe non hanno un codice univoco.</p>
              )}
              {anteprima.avvisi.length > 0 && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">{anteprima.avvisi.length} avvisi sul file</summary>
                  <ul className="mt-1 max-h-32 list-disc overflow-auto pl-5">{anteprima.avvisi.slice(0, 50).map((a, i) => <li key={i}>{a}</li>)}</ul>
                </details>
              )}
              <p className="text-xs text-muted-foreground">Le righe tolte o sostituite vengono prima archiviate e restano recuperabili.</p>
              {errore && <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-700"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />{errore}</div>}
            </div>
          )}

          {fase === 'fatto' && anteprima && (
            <div className="flex gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              Fatto: {anteprima.inserite} nuove, {anteprima.aggiornate ?? 0} modificate, {anteprima.eliminate} tolte.
            </div>
          )}

          <DialogFooter className="gap-2">
            {fase === 'fatto' ? (
              <Button onClick={() => { setOpen(false); window.location.reload(); }}>Chiudi e ricarica</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={fase === 'invio'}>Annulla</Button>
                {(fase === 'anteprima' || fase === 'invio') && anteprima && !nessunaModifica && !anteprima.bloccato && (
                  <Button onClick={() => applica(false)} disabled={fase === 'invio'}>
                    {fase === 'invio' ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Aggiorno…</> : 'Conferma e aggiorna'}
                  </Button>
                )}
                {(fase === 'anteprima' || fase === 'invio') && anteprima?.bloccato && isAmministratore && (
                  <Button variant="destructive" onClick={() => applica(true)} disabled={fase === 'invio'}>Applica comunque</Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
