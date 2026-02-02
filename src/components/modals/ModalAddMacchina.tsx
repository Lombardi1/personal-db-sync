import React, { useState } from 'react';
import { MacchinaProduzione } from '@/types';
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

interface ModalAddMacchinaProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (macchina: Omit<MacchinaProduzione, 'id' | 'created_at' | 'updated_at'>) => Promise<{ data?: MacchinaProduzione; error?: any }>;
}

export function ModalAddMacchina({ isOpen, onClose, onSubmit }: ModalAddMacchinaProps) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !tipo.trim()) {
      notifications.showError('Nome e Tipo sono obbligatori.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await onSubmit({ nome: nome.trim(), tipo: tipo.trim(), descrizione: descrizione.trim() || null });
    setIsSubmitting(false);

    if (!error) {
      setNome('');
      setTipo('');
      setDescrizione('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Aggiungi Nuova Macchina</DialogTitle>
          <DialogDescription>
            Inserisci i dettagli della nuova macchina di produzione.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nome" className="text-right">
              Nome *
            </Label>
            <div className="col-span-3">
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome macchina (es. Bobst 102)"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tipo" className="text-right">
              Tipo *
            </Label>
            <div className="col-span-3">
              <Select value={tipo} onValueChange={setTipo} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona tipo macchina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fustellatrice">Fustellatrice</SelectItem>
                  <SelectItem value="Incollatrice">Incollatrice</SelectItem>
                  <SelectItem value="Stampa">Stampa</SelectItem>
                  <SelectItem value="Taglierina">Taglierina</SelectItem>
                  <SelectItem value="Altro">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="descrizione" className="text-right">
              Descrizione
            </Label>
            <div className="col-span-3">
              <Textarea
                id="descrizione"
                value={descrizione}
                onChange={(e) => setDescrizione(e.target.value)}
                placeholder="Dettagli aggiuntivi sulla macchina"
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
              {isSubmitting ? 'Aggiunta...' : 'Aggiungi Macchina'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}