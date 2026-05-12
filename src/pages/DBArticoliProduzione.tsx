import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Search, Plus, Home, Pencil, Trash2, Save, X, ChevronDown, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Articolo } from '@/types/produzione';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface GiacenzaCartone {
  codice: string;
  tipologia: string;
  grammatura: string;
  formato: string;
  fornitore: string;
  fogli: number;
  magazzino: string;
}

interface PolimeroMag {
  codice: string;
  cliente: string;
  lavoro: string;
  resa: string;
  nr_fustella: string;
}

interface FustelloMag {
  codice: string;
  cliente: string;
  lavoro: string;
  resa: string;
  pulitore_codice: string | null;
}

interface FormData {
  codice: string;
  cliente: string;
  codice_cliente: string;
  descrizione: string;
  iso_22000: boolean;
  fsc: boolean;
  tipologia: string;
  grammatura: string;
  cartone_codice_magazzino: string;
  has_c: boolean;
  has_m: boolean;
  has_y: boolean;
  has_k: boolean;
  pan_nr: string;
  pan_nr_2: string;
  pan_nr_3: string;
  pan_nr_4: string;
  pan_nr_5: string;
  polimero: string;
  polimero_codice_magazzino: string;
  polimero_mode: 'nuovo' | 'magazzino';
  finitura: string;
  uv: string;
  polimero_uv: string;
  linear: string;
  ha_terzista: boolean;
  terzista: string;
  lavorazione: string;
  terzista_2: string;
  lavorazione_2: string;
  terzista_3: string;
  lavorazione_3: string;
  terzista_4: string;
  lavorazione_4: string;
  ha_fustella: boolean;
  fustella_nr: string;
  pulitore_codice: string;
  ha_finestratura: boolean;
  h_finestratura: string;
  tipologia_finestratura: string;
  ha_incollatura: boolean;
  macchina_incollatura: string;
  tipologia_incollatura: string;
  terzista_incollatura: boolean;
  scatolone: string;
  quantita_per_scatolone: string;
  peso: string;
  bancale: string;
}

const emptyForm = (): FormData => ({
  codice: '', cliente: '', codice_cliente: '', descrizione: '',
  iso_22000: false, fsc: false,
  tipologia: '', grammatura: '', cartone_codice_magazzino: '',
  has_c: true, has_m: true, has_y: true, has_k: true,
  pan_nr: '', pan_nr_2: '', pan_nr_3: '', pan_nr_4: '', pan_nr_5: '',
  polimero: '', polimero_codice_magazzino: '', polimero_mode: 'nuovo',
  finitura: '', uv: '', polimero_uv: '', linear: '',
  ha_terzista: false,
  terzista: '', lavorazione: '', terzista_2: '', lavorazione_2: '',
  terzista_3: '', lavorazione_3: '', terzista_4: '', lavorazione_4: '',
  ha_fustella: false, fustella_nr: '', pulitore_codice: '',
  ha_finestratura: false, h_finestratura: '', tipologia_finestratura: '',
  ha_incollatura: false, macchina_incollatura: '', tipologia_incollatura: '', terzista_incollatura: false,
  scatolone: '', quantita_per_scatolone: '', peso: '', bancale: '',
});

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b pb-1 mb-3">
      {children}
    </h3>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ReadValue({ value, empty = '—' }: { value?: string | null; empty?: string }) {
  return (
    <div className="flex h-8 items-center px-3 rounded-md border border-input bg-muted text-sm text-foreground">
      {value || <span className="text-muted-foreground">{empty}</span>}
    </div>
  );
}

function BoolBadge({ value, label }: { value: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
      value ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'
    }`}>
      {value ? '✓' : '✗'} {label}
    </span>
  );
}

function YesNoToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(false)}
        className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${
          !value ? 'bg-red-100 border-red-300 text-red-700' : 'bg-background border-border text-muted-foreground hover:bg-accent'
        }`}>NO</button>
      <button type="button" onClick={() => onChange(true)}
        className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${
          value ? 'bg-green-100 border-green-300 text-green-700' : 'bg-background border-border text-muted-foreground hover:bg-accent'
        }`}>SÌ</button>
    </div>
  );
}

function SearchCombobox({ placeholder, items, value, onSelect }: {
  placeholder: string;
  items: { id: string; label: string; sub?: string }[];
  value: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm hover:bg-accent">
          <span className={selected?.label ? '' : 'text-muted-foreground'}>{selected?.label || placeholder}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Cerca..." className="h-9" />
          <CommandEmpty>Nessun risultato</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-auto">
            {items.map((item) => (
              <CommandItem key={item.id} value={item.label + ' ' + (item.sub ?? '')} onSelect={() => { onSelect(item.id); setOpen(false); }}>
                <div>
                  <div className="font-medium text-sm">{item.label}</div>
                  {item.sub && <div className="text-xs text-muted-foreground">{item.sub}</div>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ViewDialog({ articolo, open, onClose, onEdit }: {
  articolo: Articolo | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  if (!articolo) return null;
  const r = articolo as any;
  const pantoni = [r.pan_nr, r.pan_nr_2, r.pan_nr_3, r.pan_nr_4, r.pan_nr_5].filter(Boolean);
  const terzisti = [
    { t: r.terzista, l: r.lavorazione },
    { t: r.terzista_2, l: r.lavorazione_2 },
    { t: r.terzista_3, l: r.lavorazione_3 },
    { t: r.terzista_4, l: r.lavorazione_4 },
  ].filter(x => x.t);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-mono">{r.codice}</span>
            {r.descrizione && <span className="text-muted-foreground font-normal text-sm">— {r.descrizione}</span>}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div>
            <SectionTitle>Dati Principali</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Codice"><ReadValue value={r.codice} /></Field>
              <Field label="Cliente"><ReadValue value={r.cliente} /></Field>
              <Field label="Codice Cliente"><ReadValue value={r.codice_cliente} /></Field>
              <Field label="Descrizione Articolo"><ReadValue value={r.descrizione} /></Field>
            </div>
          </div>
          <div>
            <SectionTitle>Certificazione</SectionTitle>
            <div className="flex gap-3">
              <BoolBadge value={!!r.iso_22000} label="ISO 22000" />
              <BoolBadge value={!!r.fsc} label="FSC" />
            </div>
          </div>
          <div>
            <SectionTitle>Cartone</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipologia"><ReadValue value={r.tipologia} /></Field>
              <Field label="Grammatura"><ReadValue value={r.grammatura} /></Field>
              {r.cartone_codice_magazzino && (
                <div className="col-span-2">
                  <Field label="Cartone magazzino collegato">
                    <div className="flex h-8 items-center gap-2 px-3 rounded-md border border-blue-200 bg-blue-50 text-sm text-blue-700">
                      <span className="font-mono font-medium">{r.cartone_codice_magazzino}</span>
                    </div>
                  </Field>
                </div>
              )}
            </div>
          </div>
          <div>
            <SectionTitle>Stampa</SectionTitle>
            <p className="text-xs text-muted-foreground mb-2">Colori CMYK</p>
            <div className="flex gap-3 mb-4">
              {(['c', 'm', 'y', 'k'] as const).map((ch) => (
                <BoolBadge key={ch} value={!!r[`has_${ch}`]} label={ch.toUpperCase()} />
              ))}
            </div>
            {pantoni.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground mb-2">Pantone</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {pantoni.map((p: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded border border-purple-200 bg-purple-50 text-purple-700 text-xs font-medium">{p}</span>
                  ))}
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              {(r.polimero || r.polimero_codice_magazzino) && (
                <Field label="Polimero">
                  {r.polimero_codice_magazzino
                    ? <div className="flex h-8 items-center gap-2 px-3 rounded-md border border-blue-200 bg-blue-50 text-sm text-blue-700"><span className="font-mono font-medium">{r.polimero_codice_magazzino}</span><span className="text-xs text-blue-500">(magazzino)</span></div>
                    : <ReadValue value={r.polimero} />
                  }
                </Field>
              )}
              {r.finitura && <Field label="Finitura"><ReadValue value={r.finitura} /></Field>}
              {r.polimero_uv && <Field label="Polimero UV"><ReadValue value={r.polimero_uv} /></Field>}
              {r.linear && <Field label="Linearizzazione"><ReadValue value={r.linear} /></Field>}
            </div>
          </div>
          <div>
            <SectionTitle>Terzista</SectionTitle>
            <div className="mb-2"><BoolBadge value={!!r.ha_terzista} label="Lavorazione esterna" /></div>
            {r.ha_terzista && terzisti.length > 0 && (
              <div className="space-y-2 mt-2">
                {terzisti.map((x, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <Field label={`Terzista ${i + 1}`}><ReadValue value={x.t} /></Field>
                    <Field label="Lavorazione"><ReadValue value={x.l} /></Field>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <SectionTitle>Fustella</SectionTitle>
            <div className="mb-2"><BoolBadge value={!!r.ha_fustella} label="Presente" /></div>
            {r.ha_fustella && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="col-span-2">
                  <Field label="Fustella">
                    <div className="flex h-8 items-center px-3 rounded-md border border-blue-200 bg-blue-50 text-sm text-blue-700 font-mono font-medium">
                      {r.fustella_nr || '—'}
                    </div>
                  </Field>
                </div>
                <Field label="Pulitore">
                  <div className={`flex h-8 items-center px-3 rounded-md border text-sm ${
                    r.fustella_nr && !r.pulitore_codice ? 'border-orange-300 bg-orange-50 text-orange-600' : 'border-input bg-muted text-muted-foreground'
                  }`}>
                    {r.pulitore_codice || (r.fustella_nr ? 'Non esistente' : '—')}
                  </div>
                </Field>
              </div>
            )}
          </div>
          <div>
            <SectionTitle>Finestratura</SectionTitle>
            <div className="mb-2"><BoolBadge value={!!r.ha_finestratura} label="Presente" /></div>
            {r.ha_finestratura && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Field label="Altezza finestra"><ReadValue value={r.h_finestratura} /></Field>
                <Field label="Tipologia"><ReadValue value={r.tipologia_finestratura} /></Field>
              </div>
            )}
          </div>
          <div>
            <SectionTitle>Incollatura</SectionTitle>
            <div className="mb-2"><BoolBadge value={!!r.ha_incollatura} label="Presente" /></div>
            {r.ha_incollatura && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Field label="Macchina"><ReadValue value={r.macchina_incollatura} /></Field>
                <Field label="Tipologia"><ReadValue value={r.tipologia_incollatura} /></Field>
                <div className="col-span-2"><BoolBadge value={!!r.terzista_incollatura} label="Terzista" /></div>
              </div>
            )}
          </div>
          <div>
            <SectionTitle>Confezione</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Scatolone"><ReadValue value={r.scatolone} /></Field>
              <Field label="Quantità per scatolone"><ReadValue value={r.quantita_per_scatolone} /></Field>
              <Field label="Peso"><ReadValue value={r.peso} /></Field>
              <Field label="Bancale"><ReadValue value={r.bancale} /></Field>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4 mr-2" /> Chiudi</Button>
          <Button onClick={onEdit}><Pencil className="h-4 w-4 mr-2" /> Modifica</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DBArticoliProduzione() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [articoli, setArticoli] = useState<Articolo[]>([]);
  const [searchArticolo, setSearchArticolo] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticolo, setEditingArticolo] = useState<Articolo | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingArticolo, setViewingArticolo] = useState<Articolo | null>(null);
  const [giacenze, setGiacenze] = useState<GiacenzaCartone[]>([]);
  const [polimeri, setPolimeri] = useState<PolimeroMag[]>([]);
  const [fustelle, setFustelle] = useState<FustelloMag[]>([]);
  const [form, setForm] = useState<FormData>(emptyForm());

  useEffect(() => { fetchArticoli(); fetchMagazzini(); }, []);

  const fetchArticoli = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('db_articoli').select('*').order('codice', { ascending: true });
      if (error) throw error;
      setArticoli(data || []);
    } catch (e: any) { toast.error('Errore caricamento articoli'); } finally { setLoading(false); }
  };

  const fetchMagazzini = async () => {
    const [g, p, f] = await Promise.all([
      supabase.from('giacenza').select('codice,tipologia,grammatura,formato,fornitore,fogli,magazzino').order('codice'),
      supabase.from('polimeri').select('codice,cliente,lavoro,resa,nr_fustella').eq('disponibile', true).order('codice'),
      supabase.from('fustelle').select('codice,cliente,lavoro,resa,pulitore_codice').eq('disponibile', true).order('codice'),
    ]);
    if (g.data) setGiacenze(g.data as GiacenzaCartone[]);
    if (p.data) setPolimeri(p.data as PolimeroMag[]);
    if (f.data) setFustelle(f.data as FustelloMag[]);
  };

  const articoliFiltrati = articoli.filter((a) => {
    const s = searchArticolo.toLowerCase();
    return a.codice?.toLowerCase().includes(s) || a.descrizione?.toLowerCase().includes(s) || a.cliente?.toLowerCase().includes(s) || (a as any).codice_cliente?.toLowerCase().includes(s);
  });

  const openView = (a: Articolo) => { setViewingArticolo(a); setViewOpen(true); };
  const openEditFromView = () => { setViewOpen(false); if (viewingArticolo) openEdit(viewingArticolo); };
  const openNew = () => { setEditingArticolo(null); setForm(emptyForm()); setDialogOpen(true); };

  const openEdit = (a: Articolo) => {
    setEditingArticolo(a);
    const r = a as any;
    setForm({
      codice: r.codice || '', cliente: r.cliente || '', codice_cliente: r.codice_cliente || '', descrizione: r.descrizione || '',
      iso_22000: r.iso_22000 ?? false, fsc: r.fsc ?? false,
      tipologia: r.tipologia || '', grammatura: r.grammatura || '', cartone_codice_magazzino: r.cartone_codice_magazzino || '',
      has_c: r.has_c ?? true, has_m: r.has_m ?? true, has_y: r.has_y ?? true, has_k: r.has_k ?? true,
      pan_nr: r.pan_nr || '', pan_nr_2: r.pan_nr_2 || '', pan_nr_3: r.pan_nr_3 || '', pan_nr_4: r.pan_nr_4 || '', pan_nr_5: r.pan_nr_5 || '',
      polimero: r.polimero || '', polimero_codice_magazzino: r.polimero_codice_magazzino || '',
      polimero_mode: r.polimero_codice_magazzino ? 'magazzino' : 'nuovo',
      finitura: r.finitura || '', uv: r.uv || '', polimero_uv: r.polimero_uv || '', linear: r.linear || '',
      ha_terzista: r.ha_terzista ?? false,
      terzista: r.terzista || '', lavorazione: r.lavorazione || '', terzista_2: r.terzista_2 || '', lavorazione_2: r.lavorazione_2 || '',
      terzista_3: r.terzista_3 || '', lavorazione_3: r.lavorazione_3 || '', terzista_4: r.terzista_4 || '', lavorazione_4: r.lavorazione_4 || '',
      ha_fustella: r.ha_fustella ?? false, fustella_nr: r.fustella_nr || '', pulitore_codice: r.pulitore_codice || '',
      ha_finestratura: r.ha_finestratura ?? false, h_finestratura: r.h_finestratura || '', tipologia_finestratura: r.tipologia_finestratura || '',
      ha_incollatura: r.ha_incollatura ?? false, macchina_incollatura: r.macchina_incollatura || '',
      tipologia_incollatura: r.tipologia_incollatura || '', terzista_incollatura: r.terzista_incollatura ?? false,
      scatolone: r.scatolone || '', quantita_per_scatolone: r.quantita_per_scatolone || '', peso: r.peso || '', bancale: r.bancale || '',
    });
    setDialogOpen(true);
  };

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleFustellaSelect = (codice: string) => {
    set('fustella_nr', codice);
    const f = fustelle.find((x) => x.codice === codice);
    set('pulitore_codice', f?.pulitore_codice || '');
  };

  const handleSave = async () => {
    if (!form.codice.trim()) { toast.error('Il codice articolo è obbligatorio'); return; }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        codice: form.codice, cliente: form.cliente, codice_cliente: form.codice_cliente, descrizione: form.descrizione,
        iso_22000: form.iso_22000, fsc: form.fsc,
        tipologia: form.tipologia, grammatura: form.grammatura, cartone_codice_magazzino: form.cartone_codice_magazzino || null,
        has_c: form.has_c, has_m: form.has_m, has_y: form.has_y, has_k: form.has_k,
        pan_nr: form.pan_nr, pan_nr_2: form.pan_nr_2, pan_nr_3: form.pan_nr_3, pan_nr_4: form.pan_nr_4, pan_nr_5: form.pan_nr_5,
        polimero: form.polimero_mode === 'nuovo' ? form.polimero : null,
        polimero_codice_magazzino: form.polimero_mode === 'magazzino' ? form.polimero_codice_magazzino : null,
        finitura: form.finitura, uv: form.uv, polimero_uv: form.polimero_uv, linear: form.linear,
        ha_terzista: form.ha_terzista,
        terzista: form.ha_terzista ? form.terzista : null, lavorazione: form.ha_terzista ? form.lavorazione : null,
        terzista_2: form.ha_terzista ? form.terzista_2 : null, lavorazione_2: form.ha_terzista ? form.lavorazione_2 : null,
        terzista_3: form.ha_terzista ? form.terzista_3 : null, lavorazione_3: form.ha_terzista ? form.lavorazione_3 : null,
        terzista_4: form.ha_terzista ? form.terzista_4 : null, lavorazione_4: form.ha_terzista ? form.lavorazione_4 : null,
        ha_fustella: form.ha_fustella,
        fustella_nr: form.ha_fustella ? form.fustella_nr : null, pulitore_codice: form.ha_fustella ? form.pulitore_codice : null,
        ha_finestratura: form.ha_finestratura,
        h_finestratura: form.ha_finestratura ? form.h_finestratura : null, tipologia_finestratura: form.ha_finestratura ? form.tipologia_finestratura : null,
        ha_incollatura: form.ha_incollatura,
        macchina_incollatura: form.ha_incollatura ? form.macchina_incollatura : null,
        tipologia_incollatura: form.ha_incollatura ? form.tipologia_incollatura : null,
        terzista_incollatura: form.ha_incollatura ? form.terzista_incollatura : false,
        scatolone: form.scatolone, quantita_per_scatolone: form.quantita_per_scatolone, peso: form.peso, bancale: form.bancale,
      };
      if (editingArticolo) {
        const { error } = await supabase.from('db_articoli').update(payload).eq('id', editingArticolo.id);
        if (error) throw error;
        toast.success('Articolo aggiornato');
      } else {
        const { error } = await supabase.from('db_articoli').insert(payload);
        if (error) throw error;
        toast.success('Articolo creato');
      }
      setDialogOpen(false);
      fetchArticoli();
    } catch (e: any) { toast.error('Errore: ' + (e.message || 'errore sconosciuto')); } finally { setSaving(false); }
  };

  const handleDelete = async (a: Articolo) => {
    if (!confirm(`Eliminare l'articolo ${a.codice}?`)) return;
    try {
      const { error } = await supabase.from('db_articoli').delete().eq('id', a.id);
      if (error) throw error;
      toast.success('Articolo eliminato');
      fetchArticoli();
    } catch (e: any) { toast.error('Errore eliminazione'); }
  };

  const giacenzeItems = giacenze.map((g) => ({ id: g.codice, label: g.codice, sub: [g.tipologia, g.grammatura, g.formato, g.magazzino].filter(Boolean).join(' · ') }));
  const polimeriItems = polimeri.map((p) => ({ id: p.codice, label: p.codice, sub: [p.cliente, p.lavoro].filter(Boolean).join(' · ') }));
  const fustelleItems = fustelle.map((f) => ({ id: f.codice, label: f.codice, sub: [f.cliente, f.lavoro, f.resa].filter(Boolean).join(' · ') }));

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[hsl(222.2,47.4%,11.2%)]">DB Articoli</h1>
            <p className="text-muted-foreground mt-1">{articoli.length} articoli totali</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nuovo Articolo</Button>
            <Button variant="outline" onClick={() => navigate('/summary')} className="gap-2"><Home className="h-4 w-4" /> Dashboard</Button>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cerca per codice, descrizione, cliente, codice cliente..." value={searchArticolo} onChange={(e) => setSearchArticolo(e.target.value)} className="pl-10" />
            </div>
            <div className="text-sm text-muted-foreground mt-2">{articoliFiltrati.length} articoli trovati</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codice</TableHead><TableHead>Descrizione</TableHead><TableHead>Cliente</TableHead>
                    <TableHead>Cod. Cliente</TableHead><TableHead>Tipologia</TableHead><TableHead>Fustella</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (<TableRow><TableCell colSpan={7} className="text-center py-8">Caricamento...</TableCell></TableRow>)
                  : articoliFiltrati.length === 0 ? (<TableRow><TableCell colSpan={7} className="text-center py-8">Nessun articolo trovato</TableCell></TableRow>)
                  : articoliFiltrati.map((a) => (
                    <TableRow key={a.id} className="hover:bg-accent/50 cursor-pointer" onClick={() => openView(a)}>
                      <TableCell className="font-mono text-sm font-medium">{a.codice}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{a.descrizione || '-'}</TableCell>
                      <TableCell>{a.cliente || '-'}</TableCell>
                      <TableCell>{(a as any).codice_cliente || '-'}</TableCell>
                      <TableCell>{a.tipologia || '-'}</TableCell>
                      <TableCell>{a.fustella_nr || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(a)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <ViewDialog articolo={viewingArticolo} open={viewOpen} onClose={() => setViewOpen(false)} onEdit={openEditFromView} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArticolo ? `Modifica: ${editingArticolo.codice}` : 'Nuovo Articolo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-8 py-4">
            <div>
              <SectionTitle>Dati Principali</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Codice *"><Input value={form.codice} onChange={(e) => set('codice', e.target.value)} className="h-8 text-sm" placeholder="es: SAGLRMM25" /></Field>
                <Field label="Cliente"><Input value={form.cliente} onChange={(e) => set('cliente', e.target.value)} className="h-8 text-sm" /></Field>
                <Field label="Codice Cliente"><Input value={form.codice_cliente} onChange={(e) => set('codice_cliente', e.target.value)} className="h-8 text-sm" /></Field>
                <Field label="Descrizione Articolo"><Input value={form.descrizione} onChange={(e) => set('descrizione', e.target.value)} className="h-8 text-sm" /></Field>
              </div>
            </div>
            <div>
              <SectionTitle>Certificazione</SectionTitle>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer select-none"><Checkbox checked={form.iso_22000} onCheckedChange={(v) => set('iso_22000', !!v)} /><span className="text-sm font-medium">ISO 22000</span></label>
                <label className="flex items-center gap-2 cursor-pointer select-none"><Checkbox checked={form.fsc} onCheckedChange={(v) => set('fsc', !!v)} /><span className="text-sm font-medium">FSC</span></label>
              </div>
            </div>
            <div>
              <SectionTitle>Cartone</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipologia"><Input value={form.tipologia} onChange={(e) => set('tipologia', e.target.value)} className="h-8 text-sm" /></Field>
                <Field label="Grammatura"><Input value={form.grammatura} onChange={(e) => set('grammatura', e.target.value)} className="h-8 text-sm" /></Field>
                <div className="col-span-2">
                  <Field label="Collega cartone dal magazzino">
                    <SearchCombobox placeholder="Cerca per codice, tipologia, formato..." items={giacenzeItems} value={form.cartone_codice_magazzino} onSelect={(v) => set('cartone_codice_magazzino', v)} />
                    {form.cartone_codice_magazzino && (<button type="button" className="text-xs text-muted-foreground hover:text-destructive mt-1 self-start" onClick={() => set('cartone_codice_magazzino', '')}>✕ rimuovi collegamento</button>)}
                  </Field>
                </div>
              </div>
            </div>
            <div>
              <SectionTitle>Stampa</SectionTitle>
              <p className="text-xs text-muted-foreground mb-2">Colori CMYK</p>
              <div className="flex gap-4 mb-4">
                {(['c', 'm', 'y', 'k'] as const).map((ch) => {
                  const key = `has_${ch}` as 'has_c' | 'has_m' | 'has_y' | 'has_k';
                  return (<label key={ch} className="flex items-center gap-1.5 cursor-pointer select-none"><Checkbox checked={form[key]} onCheckedChange={(v) => set(key, !!v)} /><span className="text-sm font-bold uppercase">{ch}</span></label>);
                })}
              </div>
              <p className="text-xs text-muted-foreground mb-2">Pantone</p>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {(['pan_nr', 'pan_nr_2', 'pan_nr_3', 'pan_nr_4', 'pan_nr_5'] as const).map((k, i) => (
                  <Field key={k} label={`Pant. ${i + 1}`}><Input value={form[k]} onChange={(e) => set(k, e.target.value)} className="h-8 text-sm" /></Field>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mb-2">Polimero</p>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => set('polimero_mode', 'nuovo')} className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${form.polimero_mode === 'nuovo' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:bg-accent'}`}>Nuovo</button>
                <button type="button" onClick={() => set('polimero_mode', 'magazzino')} className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${form.polimero_mode === 'magazzino' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:bg-accent'}`}>Dal magazzino</button>
              </div>
              {form.polimero_mode === 'nuovo'
                ? <Input value={form.polimero} onChange={(e) => set('polimero', e.target.value)} placeholder="Codice / descrizione polimero" className="h-8 text-sm mb-4" />
                : <div className="mb-4"><SearchCombobox placeholder="Cerca polimero dal magazzino..." items={polimeriItems} value={form.polimero_codice_magazzino} onSelect={(v) => set('polimero_codice_magazzino', v)} /></div>
              }
              <div className="grid grid-cols-2 gap-3">
                <Field label="Finitura"><Input value={form.finitura} onChange={(e) => set('finitura', e.target.value)} className="h-8 text-sm" /></Field>
                <Field label="Polimero UV"><Input value={form.polimero_uv} onChange={(e) => set('polimero_uv', e.target.value)} className="h-8 text-sm" /></Field>
                <Field label="Linearizzazione"><Input value={form.linear} onChange={(e) => set('linear', e.target.value)} className="h-8 text-sm" /></Field>
              </div>
            </div>
            <div>
              <SectionTitle>Terzista</SectionTitle>
              <div className="flex items-center gap-3 mb-3"><span className="text-sm text-muted-foreground">Lavorazione esterna:</span><YesNoToggle value={form.ha_terzista} onChange={(v) => set('ha_terzista', v)} /></div>
              {form.ha_terzista && (
                <div className="space-y-2">
                  {([['terzista','lavorazione'],['terzista_2','lavorazione_2'],['terzista_3','lavorazione_3'],['terzista_4','lavorazione_4']] as [keyof FormData, keyof FormData][]).map(([tk, lk], i) => (
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <Field label={`Terzista ${i + 1}`}><Input value={form[tk] as string} onChange={(e) => set(tk, e.target.value)} className="h-8 text-sm" /></Field>
                      <Field label="Lavorazione"><Input value={form[lk] as string} onChange={(e) => set(lk, e.target.value)} className="h-8 text-sm" /></Field>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <SectionTitle>Fustella</SectionTitle>
              <div className="flex items-center gap-3 mb-3"><span className="text-sm text-muted-foreground">Presente:</span><YesNoToggle value={form.ha_fustella} onChange={(v) => set('ha_fustella', v)} /></div>
              {form.ha_fustella && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Field label="Fustella dal magazzino"><SearchCombobox placeholder="Cerca fustella..." items={fustelleItems} value={form.fustella_nr} onSelect={handleFustellaSelect} /></Field></div>
                  <Field label="Pulitore (automatico)">
                    <div className={`flex h-8 items-center px-3 rounded-md border text-sm ${form.fustella_nr && !form.pulitore_codice ? 'border-orange-300 bg-orange-50 text-orange-600' : 'border-input bg-muted text-muted-foreground'}`}>
                      {form.fustella_nr ? form.pulitore_codice || 'Non esistente' : '—'}
                    </div>
                  </Field>
                </div>
              )}
            </div>
            <div>
              <SectionTitle>Finestratura</SectionTitle>
              <div className="flex items-center gap-3 mb-3"><span className="text-sm text-muted-foreground">Presente:</span><YesNoToggle value={form.ha_finestratura} onChange={(v) => set('ha_finestratura', v)} /></div>
              {form.ha_finestratura && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Altezza finestra"><Input value={form.h_finestratura} onChange={(e) => set('h_finestratura', e.target.value)} className="h-8 text-sm" /></Field>
                  <Field label="Tipologia"><Input value={form.tipologia_finestratura} onChange={(e) => set('tipologia_finestratura', e.target.value)} className="h-8 text-sm" /></Field>
                </div>
              )}
            </div>
            <div>
              <SectionTitle>Incollatura</SectionTitle>
              <div className="flex items-center gap-3 mb-3"><span className="text-sm text-muted-foreground">Presente:</span><YesNoToggle value={form.ha_incollatura} onChange={(v) => set('ha_incollatura', v)} /></div>
              {form.ha_incollatura && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Macchina"><Input value={form.macchina_incollatura} onChange={(e) => set('macchina_incollatura', e.target.value)} className="h-8 text-sm" /></Field>
                  <Field label="Tipologia"><Input value={form.tipologia_incollatura} onChange={(e) => set('tipologia_incollatura', e.target.value)} className="h-8 text-sm" /></Field>
                  <div className="col-span-2 flex items-center gap-3"><span className="text-sm text-muted-foreground">Terzista:</span><YesNoToggle value={form.terzista_incollatura} onChange={(v) => set('terzista_incollatura', v)} /></div>
                </div>
              )}
            </div>
            <div>
              <SectionTitle>Confezione</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Scatolone"><Input value={form.scatolone} onChange={(e) => set('scatolone', e.target.value)} className="h-8 text-sm" /></Field>
                <Field label="Quantità per scatolone"><Input value={form.quantita_per_scatolone} onChange={(e) => set('quantita_per_scatolone', e.target.value)} className="h-8 text-sm" /></Field>
                <Field label="Peso"><Input value={form.peso} onChange={(e) => set('peso', e.target.value)} className="h-8 text-sm" /></Field>
                <Field label="Bancale"><Input value={form.bancale} onChange={(e) => set('bancale', e.target.value)} className="h-8 text-sm" /></Field>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}><X className="h-4 w-4 mr-2" /> Annulla</Button>
            <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Salvataggio...' : editingArticolo ? 'Aggiorna' : 'Crea Articolo'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
