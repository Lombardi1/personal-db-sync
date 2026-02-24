import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Colore } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  quantita: z.coerce.number().min(0.01, 'Quantità deve essere maggiore di 0'),
  macchina: z.string().optional(),
  lavoro: z.string().optional(),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ModalCaricoScaricoColoreProps {
  colore: Colore;
  tipo: 'carico' | 'scarico';
  onClose: () => void;
  onConfirma: (codice: string, quantita: number, macchina?: string, lavoro?: string, note?: string) => Promise<{ error: any }>;
}

export function ModalCaricoScaricoColore({
  colore,
  tipo,
  onClose,
  onConfirma,
}: ModalCaricoScaricoColoreProps) {
  const isCarico = tipo === 'carico';
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { quantita: undefined, macchina: '', lavoro: '', note: '' },
  });

  const onSubmit = async (data: FormData) => {
    await onConfirma(
      colore.codice,
      data.quantita,
      data.macchina || undefined,
      data.lavoro || undefined,
      data.note || undefined
    );
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCarico ? '📦 Carico Colore' : '🖨️ Scarico / Consumo Colore'}
          </DialogTitle>
        </DialogHeader>
        <div className="mb-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <p className="font-semibold text-gray-800">{colore.nome}</p>
          <p className="text-sm text-gray-500">
            Codice: <span className="font-mono">{colore.codice}</span> &middot; Tipo: {colore.tipo}
          </p>
          <p className="text-sm mt-1">
            Disponibile:{' '}
            <strong
              className={
                colore.quantita_disponibile === 0 ? 'text-red-600' : 'text-green-600'
              }
            >
              {colore.quantita_disponibile} {colore.unita_misura}
            </strong>
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>
              Quantità ({colore.unita_misura}) *
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              {...register('quantita')}
              placeholder={`Es. 250`}
              autoFocus
            />
            {errors.quantita && (
              <p className="text-red-500 text-xs mt-1">{errors.quantita.message}</p>
            )}
          </div>
          {!isCarico && (
            <>
              <div>
                <Label>Macchina (opzionale)</Label>
                <Input {...register('macchina')} placeholder="Es. Heidelberg 1" />
              </div>
              <div>
                <Label>Lavoro / Commessa (opzionale)</Label>
                <Input {...register('lavoro')} placeholder="Es. Lavoro 12345" />
              </div>
            </>
          )}
          <div>
            <Label>Note (opzionali)</Label>
            <Input {...register('note')} placeholder="Note aggiuntive..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={
                isCarico
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-[hsl(var(--colori-color))] hover:bg-[hsl(var(--colori-color-dark))] text-white'
              }
            >
              {isSubmitting
                ? 'Registrazione...'
                : isCarico
                ? '📦 Registra Carico'
                : '🖨️ Registra Consumo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
