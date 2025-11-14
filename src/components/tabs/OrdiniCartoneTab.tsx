import { useState, useEffect } from 'react';
import { OrdineAttesa, Fornitore } from '@/types/fornitore';
import { formatFormato, formatGrammatura } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useOrdiniAttesa } from '@/hooks/useOrdiniAttesa';
import { useFornitori } from '@/hooks/useFornitori';
import { TabellaOrdiniAttesa } from '@/components/tables/TabellaOrdiniAttesa';
import { ModalFornitore } from '@/components/modals/ModalFornitore';
import { esportaOrdineFornitore } from '@/utils/exportOrdineFornitore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function OrdiniCartoneTab() {
  const [prossimoCodice, setProssimoCodice] = useState(1);
  const [prossimoNumeroOrdine, setProssimoNumeroOrdine] = useState('1');
  const [annoCorrente, setAnnoCorrente] = useState(new Date().getFullYear());
  const [mostraFormNuovo, setMostraFormNuovo] = useState(true);
  const [mostraModalFornitore, setMostraModalFornitore] = useState(false);
  
  const [formData, setFormData] = useState({
    codice: 'CTN-001',
    fornitore: '',
    ordine: `1/${new Date().getFullYear()}`,
    tipologia: '',
    formato: '',
    grammatura: '',
    fogli: '',
    cliente: '',
    lavoro: '',
    prezzo: '',
    data_consegna: '',
    note: ''
  });

  const { ordiniAttesa, loading, aggiungiOrdineAttesa, eliminaOrdineAttesa, spostaInOrdiniArrivo } = useOrdiniAttesa();
  const { fornitori, aggiungiFornitore } = useFornitori();

  useEffect(() => {
    const fetchLastCode = async () => {
      const anno = new Date().getFullYear();
      setAnnoCorrente(anno);

      // Fetch ultimo codice cartone
      const [giacenzaRes, ordiniRes, attesaRes] = await Promise.all([
        supabase.from('giacenza').select('codice').order('codice', { ascending: false }).limit(1),
        supabase.from('ordini').select('codice').order('codice', { ascending: false }).limit(1),
        supabase.from('ordini_attesa').select('codice').order('codice', { ascending: false }).limit(1)
      ]);
      
      const allCodes = [...(giacenzaRes.data || []), ...(ordiniRes.data || []), ...(attesaRes.data || [])];
      if (allCodes.length > 0) {
        const maxCode = allCodes.reduce((max, item) => {
          const num = parseInt(item.codice.replace('CTN-', ''));
          return num > max ? num : max;
        }, 0);
        const nextCode = maxCode + 1;
        setProssimoCodice(nextCode);
        setFormData(prev => ({ ...prev, codice: `CTN-${String(nextCode).padStart(3, '0')}` }));
      }

      // Fetch ultimo numero ordine per l'anno corrente
      const { data: ordiniAnno } = await supabase
        .from('ordini_attesa')
        .select('ordine')
        .like('ordine', `%/${anno}`);

      const { data: ordiniArrivoAnno } = await supabase
        .from('ordini')
        .select('ordine')
        .like('ordine', `%/${anno}`);

      const tuttiOrdiniAnno = [...(ordiniAnno || []), ...(ordiniArrivoAnno || [])];

      if (tuttiOrdiniAnno.length > 0) {
        const maxNumero = tuttiOrdiniAnno.reduce((max, item) => {
          const parts = item.ordine.split('/');
          if (parts.length === 2 && parts[1] === String(anno)) {
            const num = parseInt(parts[0]);
            return num > max ? num : max;
          }
          return max;
        }, 0);
        const nextNumero = maxNumero + 1;
        setProssimoNumeroOrdine(String(nextNumero));
        setFormData(prev => ({ ...prev, ordine: `${nextNumero}/${anno}` }));
      } else {
        setProssimoNumeroOrdine('1');
        setFormData(prev => ({ ...prev, ordine: `1/${anno}` }));
      }
    };
    fetchLastCode();
  }, [ordiniAttesa]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fornitore || !formData.ordine || !formData.tipologia || 
        !formData.formato || !formData.grammatura || !formData.fogli || 
        !formData.cliente || !formData.lavoro || !formData.prezzo) {
      toast.error('⚠️ Compila tutti i campi obbligatori (*)');
      return;
    }

    const nuovoOrdine: OrdineAttesa = {
      codice: formData.codice,
      fornitore: formData.fornitore.trim(),
      ordine: formData.ordine.trim(),
      tipologia: formData.tipologia.trim(),
      formato: formatFormato(formData.formato),
      grammatura: formatGrammatura(formData.grammatura),
      fogli: parseInt(formData.fogli),
      cliente: formData.cliente.trim(),
      lavoro: formData.lavoro.trim(),
      prezzo: parseFloat(formData.prezzo),
      data_consegna: formData.data_consegna || undefined,
      note: formData.note.trim() || '-'
    };

    const { error } = await aggiungiOrdineAttesa(nuovoOrdine);
    
    if (!error) {
      toast.success(`✅ Ordine in attesa registrato: ${formData.codice}`);
      
      const newCodice = prossimoCodice + 1;
      const newNumeroOrdine = parseInt(prossimoNumeroOrdine) + 1;
      setProssimoCodice(newCodice);
      setProssimoNumeroOrdine(String(newNumeroOrdine));
      
      setFormData({
        codice: `CTN-${String(newCodice).padStart(3, '0')}`,
        fornitore: '',
        ordine: `${newNumeroOrdine}/${annoCorrente}`,
        tipologia: '',
        formato: '',
        grammatura: '',
        fogli: '',
        cliente: '',
        lavoro: '',
        prezzo: '',
        data_consegna: '',
        note: ''
      });
    }
  };

  const resetForm = () => {
    setFormData(prev => ({
      ...prev,
      fornitore: '',
      ordine: `${prossimoNumeroOrdine}/${annoCorrente}`,
      tipologia: '',
      formato: '',
      grammatura: '',
      fogli: '',
      cliente: '',
      lavoro: '',
      prezzo: '',
      data_consegna: '',
      note: ''
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-[hsl(var(--carico-color))] flex items-center gap-2">
          <i className="fas fa-clipboard-list"></i> Ordini Cartone
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setMostraModalFornitore(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <i className="fas fa-building"></i>
            Gestione Fornitori
          </Button>
          <Button
            onClick={() => setMostraFormNuovo(!mostraFormNuovo)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <i className={`fas fa-${mostraFormNuovo ? 'eye-slash' : 'plus'}`}></i>
            {mostraFormNuovo ? 'Nascondi Form' : 'Nuovo Ordine'}
          </Button>
        </div>
      </div>

      {mostraFormNuovo && (
        <form onSubmit={handleSubmit} className="bg-[hsl(210,40%,98%)] rounded-lg p-6 border border-[hsl(var(--border))] mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="codice">Codice Cartone *</Label>
              <Input
                id="codice"
                value={formData.codice}
                readOnly
                className="bg-[hsl(var(--muted))] font-bold"
              />
            </div>

            <div>
              <Label htmlFor="fornitore">Fornitore *</Label>
              <Select value={formData.fornitore} onValueChange={(value) => handleChange('fornitore', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona fornitore" />
                </SelectTrigger>
                <SelectContent>
                  {fornitori.map((f) => (
                    <SelectItem key={f.id} value={f.ragione_sociale}>
                      {f.ragione_sociale}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ordine">N° Ordine *</Label>
              <Input
                id="ordine"
                value={formData.ordine}
                readOnly
                className="bg-[hsl(var(--muted))] font-bold"
              />
            </div>

            <div>
              <Label htmlFor="tipologia">Tipologia Cartone *</Label>
              <Input
                id="tipologia"
                value={formData.tipologia}
                onChange={(e) => handleChange('tipologia', e.target.value)}
                placeholder="es. PATINATO"
              />
            </div>

            <div>
              <Label htmlFor="formato">Formato Cartone *</Label>
              <Input
                id="formato"
                value={formData.formato}
                onChange={(e) => handleChange('formato', e.target.value)}
                placeholder="es. 70x100"
              />
            </div>

            <div>
              <Label htmlFor="grammatura">Grammatura *</Label>
              <Input
                id="grammatura"
                value={formData.grammatura}
                onChange={(e) => handleChange('grammatura', e.target.value)}
                placeholder="es. 300"
              />
            </div>

            <div>
              <Label htmlFor="fogli">Fogli *</Label>
              <Input
                id="fogli"
                type="number"
                value={formData.fogli}
                onChange={(e) => handleChange('fogli', e.target.value)}
                placeholder="es. 1000"
              />
            </div>

            <div>
              <Label htmlFor="cliente">Cliente *</Label>
              <Input
                id="cliente"
                value={formData.cliente}
                onChange={(e) => handleChange('cliente', e.target.value)}
                placeholder="es. ACME Corp"
              />
            </div>

            <div>
              <Label htmlFor="lavoro">Lavoro *</Label>
              <Input
                id="lavoro"
                value={formData.lavoro}
                onChange={(e) => handleChange('lavoro', e.target.value)}
                placeholder="es. Catalogo 2025"
              />
            </div>

            <div>
              <Label htmlFor="prezzo">Prezzo €/kg *</Label>
              <Input
                id="prezzo"
                type="number"
                step="0.01"
                value={formData.prezzo}
                onChange={(e) => handleChange('prezzo', e.target.value)}
                placeholder="es. 1.50"
              />
            </div>

            <div>
              <Label htmlFor="data_consegna">Data Consegna Prevista</Label>
              <Input
                id="data_consegna"
                type="date"
                value={formData.data_consegna}
                onChange={(e) => handleChange('data_consegna', e.target.value)}
              />
            </div>

            <div className="lg:col-span-2">
              <Label htmlFor="note">Note</Label>
              <Input
                id="note"
                value={formData.note}
                onChange={(e) => handleChange('note', e.target.value)}
                placeholder="Note aggiuntive..."
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button type="submit" className="flex items-center gap-2">
              <i className="fas fa-save"></i>
              Salva Ordine in Attesa
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              <i className="fas fa-eraser"></i>
              Pulisci Form
            </Button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border border-[hsl(var(--border))] p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <i className="fas fa-clock text-orange-500"></i>
          Ordini in Attesa ({ordiniAttesa.length})
        </h3>
        
        {loading ? (
          <div className="text-center py-8">Caricamento...</div>
        ) : (
          <TabellaOrdiniAttesa
            ordini={ordiniAttesa}
            fornitori={fornitori}
            onElimina={eliminaOrdineAttesa}
            onSpostaInArrivo={spostaInOrdiniArrivo}
          />
        )}
      </div>

      <ModalFornitore
        isOpen={mostraModalFornitore}
        onClose={() => setMostraModalFornitore(false)}
        fornitori={fornitori}
        onAggiungi={aggiungiFornitore}
      />
    </div>
  );
}
