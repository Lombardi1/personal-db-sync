import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Search, Plus, Home, Pencil, Trash2, Database, Save, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function DBArticoliProduzione() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [articoli, setArticoli] = useState<Articolo[]>([]);
  const [searchArticolo, setSearchArticolo] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticolo, setEditingArticolo] = useState<Articolo | null>(null);
  const [saving, setSaving] = useState(false);

  // Campi form nuovo/modifica articolo
  const [formData, setFormData] = useState({
    codice: '',
    descrizione: '',
    cliente: '',
    linea: '',
    tipologia: '',
    certificazione: '',
    cartone: '',
    grammatura: '',
    c: '', m: '', y: '', k: '',
    pan_nr: '', pan_nr_2: '', pan_nr_3: '',
    pan_nr_4: '', pan_nr_5: '', pan_nr_6: '',
    polimero: '', linear: '', finitura: '',
    uv: '', polimero_uv: '',
    terzista: '', lavorazione: '',
    terzista_2: '', lavorazione_2: '',
    cliche_nr: '', pellicola_nr: '',
    fustella_nr: '', tassello: '',
    finestratura: '', h_finestratura: '',
    incollatura: '', tipologia_incollatura: '',
    scatolone: '', quantita: '', peso: '',
    archivio: '', nr_archivio: '',
  });

  useEffect(() => {
    fetchArticoli();
  }, []);

  const fetchArticoli = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('db_articoli')
        .select('*')
        .order('codice', { ascending: true });

      if (error) throw error;
      setArticoli(data || []);
    } catch (error: any) {
      console.error('Errore caricamento articoli:', error);
      toast.error('Errore nel caricamento articoli');
    } finally {
      setLoading(false);
    }
  };

  const articoliFiltrati = articoli.filter(articolo => {
    const search = searchArticolo.toLowerCase();
    return (
      articolo.id.toLowerCase().includes(search) ||
      articolo.codice.toLowerCase().includes(search) ||
      (articolo.descrizione && articolo.descrizione.toLowerCase().includes(search)) ||
      (articolo.cliente && articolo.cliente.toLowerCase().includes(search))
    );
  });

  const resetForm = () => {
    setFormData({
      codice: '', descrizione: '', cliente: '', linea: '', tipologia: '',
      certificazione: '', cartone: '', grammatura: '',
      c: '', m: '', y: '', k: '',
      pan_nr: '', pan_nr_2: '', pan_nr_3: '',
      pan_nr_4: '', pan_nr_5: '', pan_nr_6: '',
      polimero: '', linear: '', finitura: '',
      uv: '', polimero_uv: '',
      terzista: '', lavorazione: '',
      terzista_2: '', lavorazione_2: '',
      cliche_nr: '', pellicola_nr: '',
      fustella_nr: '', tassello: '',
      finestratura: '', h_finestratura: '',
      incollatura: '', tipologia_incollatura: '',
      scatolone: '', quantita: '', peso: '',
      archivio: '', nr_archivio: '',
    });
  };

  const openNew = () => {
    resetForm();
    setEditingArticolo(null);
    setDialogOpen(true);
  };

  const openEdit = (articolo: Articolo) => {
    setEditingArticolo(articolo);
    setFormData({
      codice: articolo.codice || '',
      descrizione: articolo.descrizione || '',
      cliente: articolo.cliente || '',
      linea: articolo.linea || '',
      tipologia: articolo.tipologia || '',
      certificazione: articolo.certificazione || '',
      cartone: articolo.cartone || '',
      grammatura: articolo.grammatura || '',
      c: articolo.c || '', m: articolo.m || '',
      y: articolo.y || '', k: articolo.k || '',
      pan_nr: articolo.pan_nr || '', pan_nr_2: articolo.pan_nr_2 || '',
      pan_nr_3: articolo.pan_nr_3 || '', pan_nr_4: articolo.pan_nr_4 || '',
      pan_nr_5: articolo.pan_nr_5 || '', pan_nr_6: articolo.pan_nr_6 || '',
      polimero: articolo.polimero || '', linear: articolo.linear || '',
      finitura: articolo.finitura || '', uv: articolo.uv || '',
      polimero_uv: articolo.polimero_uv || '',
      terzista: articolo.terzista || '', lavorazione: articolo.lavorazione || '',
      terzista_2: articolo.terzista_2 || '', lavorazione_2: articolo.lavorazione_2 || '',
      cliche_nr: articolo.cliche_nr || '', pellicola_nr: articolo.pellicola_nr || '',
      fustella_nr: articolo.fustella_nr || '', tassello: articolo.tassello || '',
      finestratura: articolo.finestratura || '', h_finestratura: articolo.h_finestratura || '',
      incollatura: articolo.incollatura || '', tipologia_incollatura: articolo.tipologia_incollatura || '',
      scatolone: articolo.scatolone || '', quantita: articolo.quantita || '',
      peso: articolo.peso || '',
      archivio: articolo.archivio || '', nr_archivio: articolo.nr_archivio || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.codice.trim()) {
      toast.error('Il codice articolo è obbligatorio');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = { ...formData };

      if (editingArticolo) {
        // Modifica
        const { error } = await supabase
          .from('db_articoli')
          .update(dataToSave)
          .eq('id', editingArticolo.id);

        if (error) throw error;
        toast.success('Articolo aggiornato');
      } else {
        // Nuovo
        const { error } = await supabase
          .from('db_articoli')
          .insert(dataToSave);

        if (error) throw error;
        toast.success('Articolo aggiunto');
      }

      setDialogOpen(false);
      fetchArticoli();
    } catch (error: any) {
      console.error('Errore salvataggio:', error);
      toast.error('Errore: ' + (error.message || 'errore sconosciuto'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (articolo: Articolo) => {
    if (!confirm(`Eliminare l'articolo ${articolo.codice}?`)) return;

    try {
      const { error } = await supabase
        .from('db_articoli')
        .delete()
        .eq('id', articolo.id);

      if (error) throw error;
      toast.success('Articolo eliminato');
      fetchArticoli();
    } catch (error: any) {
      console.error('Errore eliminazione:', error);
      toast.error('Errore: ' + (error.message || 'errore sconosciuto'));
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Campi organizzati per sezione nel form
  const formSections = [
    {
      title: 'Dati Principali',
      fields: [
        { key: 'codice', label: 'Codice *', placeholder: 'es: SAGLRMM25' },
        { key: 'descrizione', label: 'Descrizione', placeholder: 'Descrizione articolo' },
        { key: 'cliente', label: 'Cliente', placeholder: 'Nome cliente' },
        { key: 'linea', label: 'Linea', placeholder: 'Linea prodotto' },
        { key: 'tipologia', label: 'Tipologia', placeholder: 'Tipologia' },
        { key: 'certificazione', label: 'Certificazione', placeholder: 'FSC, PEFC...' },
      ],
    },
    {
      title: 'Materiali',
      fields: [
        { key: 'cartone', label: 'Cartone', placeholder: '' },
        { key: 'grammatura', label: 'Grammatura', placeholder: '' },
        { key: 'polimero', label: 'Polimero', placeholder: '' },
        { key: 'linear', label: 'Linear', placeholder: '' },
        { key: 'finitura', label: 'Finitura', placeholder: '' },
        { key: 'uv', label: 'UV', placeholder: '' },
        { key: 'polimero_uv', label: 'Polimero UV', placeholder: '' },
      ],
    },
    {
      title: 'Colori CMYK',
      fields: [
        { key: 'c', label: 'C', placeholder: '' },
        { key: 'm', label: 'M', placeholder: '' },
        { key: 'y', label: 'Y', placeholder: '' },
        { key: 'k', label: 'K', placeholder: '' },
      ],
    },
    {
      title: 'Pantone',
      fields: [
        { key: 'pan_nr', label: 'Pantone 1', placeholder: '' },
        { key: 'pan_nr_2', label: 'Pantone 2', placeholder: '' },
        { key: 'pan_nr_3', label: 'Pantone 3', placeholder: '' },
        { key: 'pan_nr_4', label: 'Pantone 4', placeholder: '' },
        { key: 'pan_nr_5', label: 'Pantone 5', placeholder: '' },
        { key: 'pan_nr_6', label: 'Pantone 6', placeholder: '' },
      ],
    },
    {
      title: 'Lavorazione',
      fields: [
        { key: 'terzista', label: 'Terzista', placeholder: '' },
        { key: 'lavorazione', label: 'Lavorazione', placeholder: '' },
        { key: 'terzista_2', label: 'Terzista 2', placeholder: '' },
        { key: 'lavorazione_2', label: 'Lavorazione 2', placeholder: '' },
        { key: 'cliche_nr', label: 'Cliche Nr', placeholder: '' },
        { key: 'pellicola_nr', label: 'Pellicola Nr', placeholder: '' },
        { key: 'fustella_nr', label: 'Fustella Nr', placeholder: '' },
        { key: 'tassello', label: 'Tassello', placeholder: '' },
      ],
    },
    {
      title: 'Confezionamento',
      fields: [
        { key: 'finestratura', label: 'Finestratura', placeholder: '' },
        { key: 'h_finestratura', label: 'H Finestratura', placeholder: '' },
        { key: 'incollatura', label: 'Incollatura', placeholder: '' },
        { key: 'tipologia_incollatura', label: 'Tipo Incollatura', placeholder: '' },
        { key: 'scatolone', label: 'Scatolone', placeholder: '' },
        { key: 'quantita', label: 'Quantità', placeholder: '' },
        { key: 'peso', label: 'Peso', placeholder: '' },
      ],
    },
    {
      title: 'Archivio',
      fields: [
        { key: 'archivio', label: 'Archivio', placeholder: '' },
        { key: 'nr_archivio', label: 'Nr Archivio', placeholder: '' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header />

      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[hsl(222.2,47.4%,11.2%)]">
              DB Articoli
            </h1>
            <p className="text-[hsl(215.4,16.3%,46.9%)] mt-1">
              Gestisci il database degli articoli ({articoli.length} totali)
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuovo Articolo
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/summary')}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </div>

        {/* Ricerca */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per ID, codice, descrizione, cliente..."
                value={searchArticolo}
                onChange={(e) => setSearchArticolo(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {articoliFiltrati.length} articoli trovati
            </div>
          </CardContent>
        </Card>

        {/* Tabella Articoli */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codice</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Linea</TableHead>
                    <TableHead>Tipologia</TableHead>
                    <TableHead>Cartone</TableHead>
                    <TableHead>Fustella</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Caricamento...
                      </TableCell>
                    </TableRow>
                  ) : articoliFiltrati.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Nessun articolo trovato
                      </TableCell>
                    </TableRow>
                  ) : (
                    articoliFiltrati.map((articolo) => (
                      <TableRow key={articolo.id} className="hover:bg-accent/50">
                        <TableCell className="font-mono text-sm font-medium">
                          {articolo.codice}
                        </TableCell>
                        <TableCell className="max-w-[250px] truncate">
                          {articolo.descrizione || '-'}
                        </TableCell>
                        <TableCell>{articolo.cliente || '-'}</TableCell>
                        <TableCell>{articolo.linea || '-'}</TableCell>
                        <TableCell>{articolo.tipologia || '-'}</TableCell>
                        <TableCell>{articolo.cartone || '-'}</TableCell>
                        <TableCell>{articolo.fustella_nr || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(articolo)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(articolo)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog Nuovo/Modifica Articolo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArticolo ? `Modifica: ${editingArticolo.codice}` : 'Nuovo Articolo'}
            </DialogTitle>
            <DialogDescription>
              {editingArticolo ? 'Modifica i dati dell\'articolo' : 'Inserisci i dati del nuovo articolo'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {formSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  {section.title}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {section.fields.map((field) => (
                    <div key={field.key}>
                      <Label htmlFor={field.key} className="text-xs">
                        {field.label}
                      </Label>
                      <Input
                        id={field.key}
                        value={(formData as any)[field.key]}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              <X className="h-4 w-4 mr-2" />
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvataggio...' : (editingArticolo ? 'Aggiorna' : 'Crea Articolo')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
