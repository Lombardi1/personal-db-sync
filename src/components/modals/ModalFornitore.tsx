import { useState, useEffect } from 'react';
import { Fornitore } from '@/types/fornitore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface ModalFornitoreProps {
  isOpen: boolean;
  onClose: () => void;
  fornitori: Fornitore[];
  onAggiungi: (fornitore: Fornitore) => Promise<{ error: any }>;
}

export function ModalFornitore({ isOpen, onClose, fornitori, onAggiungi }: ModalFornitoreProps) {
  const [mostraForm, setMostraForm] = useState(false);
  const [prossimoCodice, setProssimoCodice] = useState(1);
  const [formData, setFormData] = useState<Partial<Fornitore>>({
    codice: 'FOR-001',
    ragione_sociale: '',
    indirizzo: '',
    cap: '',
    citta: '',
    provincia: '',
    telefono: '',
    fax: '',
    email: '',
    piva: '',
    codice_fiscale: '',
    rea: '',
    banca_1: '',
    banca_2: '',
    condizioni_pagamento: ''
  });

  useEffect(() => {
    const fetchLastCode = async () => {
      const { data, error } = await supabase
        .from('fornitori')
        .select('codice')
        .order('codice', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        const maxCode = data.reduce((max, item) => {
          const num = parseInt(item.codice.replace('FOR-', ''));
          return num > max ? num : max;
        }, 0);
        const nextCode = maxCode + 1;
        setProssimoCodice(nextCode);
        setFormData(prev => ({ ...prev, codice: `FOR-${String(nextCode).padStart(3, '0')}` }));
      }
    };
    
    if (isOpen && mostraForm) {
      fetchLastCode();
    }
  }, [isOpen, mostraForm, fornitori]);

  const handleChange = (field: keyof Fornitore, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.codice || !formData.ragione_sociale || !formData.indirizzo || 
        !formData.cap || !formData.citta || !formData.provincia || !formData.piva) {
      toast.error('⚠️ Compila tutti i campi obbligatori (*)');
      return;
    }

    const { error } = await onAggiungi(formData as Fornitore);
    
    if (!error) {
      toast.success(`✅ Fornitore ${formData.ragione_sociale} aggiunto con successo`);
      
      const newCodice = prossimoCodice + 1;
      setProssimoCodice(newCodice);
      setFormData({
        codice: `FOR-${String(newCodice).padStart(3, '0')}`,
        ragione_sociale: '',
        indirizzo: '',
        cap: '',
        citta: '',
        provincia: '',
        telefono: '',
        fax: '',
        email: '',
        piva: '',
        codice_fiscale: '',
        rea: '',
        banca_1: '',
        banca_2: '',
        condizioni_pagamento: ''
      });
      setMostraForm(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <i className="fas fa-building"></i>
            Gestione Fornitori
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            onClick={() => setMostraForm(!mostraForm)}
            className="w-full"
            variant={mostraForm ? "outline" : "default"}
          >
            <i className={`fas fa-${mostraForm ? 'list' : 'plus'} mr-2`}></i>
            {mostraForm ? 'Mostra Lista Fornitori' : 'Aggiungi Nuovo Fornitore'}
          </Button>

          {mostraForm ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="codice">Codice Fornitore *</Label>
                  <Input
                    id="codice"
                    value={formData.codice}
                    readOnly
                    className="bg-[hsl(var(--muted))] font-bold"
                  />
                </div>
                <div>
                  <Label htmlFor="ragione_sociale">Ragione Sociale *</Label>
                  <Input
                    id="ragione_sociale"
                    value={formData.ragione_sociale}
                    onChange={(e) => handleChange('ragione_sociale', e.target.value)}
                    placeholder="es. ACME SRL"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="indirizzo">Indirizzo *</Label>
                  <Input
                    id="indirizzo"
                    value={formData.indirizzo}
                    onChange={(e) => handleChange('indirizzo', e.target.value)}
                    placeholder="es. Via Roma, 123"
                  />
                </div>
                <div>
                  <Label htmlFor="cap">CAP *</Label>
                  <Input
                    id="cap"
                    value={formData.cap}
                    onChange={(e) => handleChange('cap', e.target.value)}
                    placeholder="es. 25050"
                  />
                </div>
                <div>
                  <Label htmlFor="citta">Città *</Label>
                  <Input
                    id="citta"
                    value={formData.citta}
                    onChange={(e) => handleChange('citta', e.target.value)}
                    placeholder="es. Milano"
                  />
                </div>
                <div>
                  <Label htmlFor="provincia">Provincia *</Label>
                  <Input
                    id="provincia"
                    value={formData.provincia}
                    onChange={(e) => handleChange('provincia', e.target.value)}
                    placeholder="es. MI"
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label htmlFor="telefono">Telefono</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => handleChange('telefono', e.target.value)}
                    placeholder="es. 02 12345678"
                  />
                </div>
                <div>
                  <Label htmlFor="fax">Fax</Label>
                  <Input
                    id="fax"
                    value={formData.fax}
                    onChange={(e) => handleChange('fax', e.target.value)}
                    placeholder="es. 02 87654321"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="es. info@acme.it"
                  />
                </div>
                <div>
                  <Label htmlFor="piva">Partita IVA *</Label>
                  <Input
                    id="piva"
                    value={formData.piva}
                    onChange={(e) => handleChange('piva', e.target.value)}
                    placeholder="es. IT12345678901"
                  />
                </div>
                <div>
                  <Label htmlFor="codice_fiscale">Codice Fiscale</Label>
                  <Input
                    id="codice_fiscale"
                    value={formData.codice_fiscale}
                    onChange={(e) => handleChange('codice_fiscale', e.target.value)}
                    placeholder="es. IT12345678901"
                  />
                </div>
                <div>
                  <Label htmlFor="rea">REA</Label>
                  <Input
                    id="rea"
                    value={formData.rea}
                    onChange={(e) => handleChange('rea', e.target.value)}
                    placeholder="es. MI-123456"
                  />
                </div>
                <div>
                  <Label htmlFor="banca_1">Banca 1</Label>
                  <Input
                    id="banca_1"
                    value={formData.banca_1}
                    onChange={(e) => handleChange('banca_1', e.target.value)}
                    placeholder="es. Banca Popolare"
                  />
                </div>
                <div>
                  <Label htmlFor="banca_2">Banca 2</Label>
                  <Input
                    id="banca_2"
                    value={formData.banca_2}
                    onChange={(e) => handleChange('banca_2', e.target.value)}
                    placeholder="es. Unicredit"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="condizioni_pagamento">Condizioni di Pagamento</Label>
                  <Input
                    id="condizioni_pagamento"
                    value={formData.condizioni_pagamento}
                    onChange={(e) => handleChange('condizioni_pagamento', e.target.value)}
                    placeholder="es. R.B. 60 GG F.M."
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit">
                  <i className="fas fa-save mr-2"></i>
                  Salva Fornitore
                </Button>
                <Button type="button" variant="outline" onClick={() => setMostraForm(false)}>
                  Annulla
                </Button>
              </div>
            </form>
          ) : (
            <ScrollArea className="h-[500px] rounded-md border p-4">
              {fornitori.length === 0 ? (
                <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
                  <i className="fas fa-inbox text-4xl mb-3"></i>
                  <p>Nessun fornitore in anagrafica</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fornitori.map((fornitore) => (
                    <div key={fornitore.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg">{fornitore.ragione_sociale}</h4>
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">Cod. {fornitore.codice}</p>
                          <div className="mt-2 text-sm space-y-1">
                            <p>{fornitore.indirizzo}</p>
                            <p>{fornitore.cap} {fornitore.citta} ({fornitore.provincia})</p>
                            {fornitore.telefono && <p><i className="fas fa-phone mr-2"></i>{fornitore.telefono}</p>}
                            {fornitore.email && <p><i className="fas fa-envelope mr-2"></i>{fornitore.email}</p>}
                            <p className="font-semibold">P.IVA: {fornitore.piva}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
