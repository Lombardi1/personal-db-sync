import React, { useState, useEffect } from 'react';
import { LavoroProduzione, MacchinaProduzione } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as notifications from '@/utils/notifications';

interface ModalEditLavoroProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, dati: Partial<Omit<LavoroProduzione, 'id' | 'created_at' | 'updated_at' | 'macchina_nome'>>) => Promise<{ data?: LavoroProduzione; error?: any }>;
  initialData: LavoroProduzione;
  macchine: MacchinaProduzione[];
}

export function ModalEditLavoro({ isOpen, onClose, onSubmit, initialData, macchine }: ModalEditLavoroProps) {
  const [macchinaId, setMacchinaId] = useState(initialData.macchina_id);
  const [nomeLavoro, setNomeLavoro] = useState(initialData.nome_lavoro);
  const [stato, setStato] = useState<LavoroProduzione['stato']>(initialData.stato);
  const [dataInizioPrevista, setDataInizioPrevista] = useState(initialData.data_inizio_prevista || '');
  const [dataFinePrevista, setDataFinePrevista] = useState(initialData.data_fine_prevista || '');
  const [dataInizioEffettiva, setDataInizioEffettiva] = useState(initialData.data_inizio_effettiva || '');
  const [dataFineEffettiva, setDataFineEffettiva] = useState(initialData.data_fine_effettiva || '');
  const [note, setNote] = useState(initialData.note || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMacchinaId(initialData.macchina_id);
      setNomeLavoro(initialData.nome_lavoro);
      setStato(initialData.stato);
      setDataInizioPrevista(initialData.data_inizio_prevista || '');
      setDataFinePrevista(initialData.data_fine_prevista || '');
      setDataInizioEffettiva(initialData.data_inizio_effettiva || '');
      setDataFineEffettiva(initialData.data_fine_effettiva || '');
      setNote(initialData.note || '');
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!macchinaId || !nomeLavoro.trim() || !stato) {
      notifications.showError('Macchina, Nome Lavoro e Stato sono obbligatori.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await onSubmit(initialData.id, {
      macchina_id: macchinaId,
      nome_lavoro: nomeLavoro.trim(),
      stato,
      data_inizio_prevista: dataInizioPrevista || null,
      data_fine_prevista: dataFinePrevista || null,
      data_inizio_effettiva: dataInizioEffettiva || null,
      data_fine_effettiva: dataFineEffettiva || null,
      note: note.trim() || null,
    });
    setIsSubmitting(false);

    if (!error) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifica Lavoro</DialogTitle>
          <DialogDescription>
            Modifica i dettagli del lavoro <strong>{initialData.nome_lavoro}</strong>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="macchina" className="text-right">
              Macchina *
            </Label>
            <div className="col-span-3">
              <Select value={macchinaId} onValueChange={setMacchinaId} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona macchina" />
                </SelectTrigger>
                <SelectContent>
                  {macchine.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nome} ({m.tipo})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nomeLavoro" className="text-right">
              Nome Lavoro *
            </Label>
            <div className="col-span-3">
              <Input
                id="nomeLavoro"
                value={nomeLavoro}
                onChange={(e) => setNomeLavoro(e.target.value)}
                placeholder="Nome del lavoro"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="stato" className="text-right">
              Stato *
            </Label>
            <div className="col-span-3">
              <Select value={stato} onValueChange={setStato} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_attesa">In Attesa</SelectItem>
                  <SelectItem value="in_produzione">In Produzione</SelectItem>
                  <SelectItem value="completato">Completato</SelectItem>
                  <SelectItem value="annullato">Annullato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dataInizioPrevista" className="text-right">
              Inizio Previsto
            </Label>
            <div className="col-span-3">
              <Input
                id="dataInizioPrevista"
                type="date"
                value={dataInizioPrevista}
                onChange={(e) => setDataInizioPrevista(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dataFinePrevista" className="text-right">
              Fine Prevista
            </Label>
            <div className="col-span-3">
              <Input
                id="dataFinePrevista"
                type="date"
                value={dataFinePrevista}
                onChange={(e) => setDataFinePrevista(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dataInizioEffettiva" className="text-right">
              Inizio Effettivo
            </Label>
            <div className="col-span-3">
              <Input
                id="dataInizioEffettiva"
                type="date"
                value={dataInizioEffettiva}
                onChange={(e) => setDataInizioEffettiva(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dataFineEffettiva" className="text-right">
              Fine Effettivo
            </Label>
            <div className="col-span-3">
              <Input
                id="dataFineEffettiva"
                type="date"
                value={dataFineEffettiva}
                onChange={(e) => setDataFineEffettiva(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="note" className="text-right">
              Note
            </Label>
            <div className="col-span-3">
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note aggiuntive"
                disabled={isSubmitting}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[hsl(var(--produzione-color))] hover:bg-[hsl(var(--produzione-color-dark))] text-white">
              {isSubmitting ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}