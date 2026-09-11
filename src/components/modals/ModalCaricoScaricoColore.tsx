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
  quantita: z.coerce.number().min(0.001, 'Quantità deve essere maggiore di 0'),
  // Carico
  numero_ddt: z.string().optional(),
  data_ddt: z.string().optional(),
  lotto: z.string().optional(),
  // Scarico
  macchina: z.string().optional(),
  lavoro: z.string().optional(),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ModalCaricoScaricoColoreProps {
  colore: Colore;
  tipo: 'carico' | 'scarico';
  onClose: () => void;
  onConfirma: (
    codice: string,
    quantita: number,
    extra: {
      numero_ddt?: string;
      data_ddt?: string;
      lotto?: string;
      macchina?: string;
      lavoro?: string;
      note?: string;
    }
  ) => Promise<{ error: any }>;
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
    defaultValues: { quantita: undefined },
  });

  const onSubmit = async (data: FormData) => {
    const result = await onConfirma(colore.codice, data.quantita, {
      numero_ddt: data.numero_ddt || undefined,
      data_ddt: data.data_ddt || undefined,
      lotto: data.lotto || undefined,
      macchina: data.macchina || undefined,
      lavoro: data.lavoro || undefined,
      note: data.note || undefined,
    });
    if (!result.error) onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCarico ? '📦 Carico Colore' : '🖨️ Scarico / Consumo Colore'}
          </DialogTitle>
        </DialogHeader>

        {/* Info colore */}
        <div className="mb-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <p className="font-semibold text-gray-800">{colore.nome}</p>
          <p className="text-sm text-gray-500">
            Codice: <span className="font-mono">{colore.codice}</span> · Tipo: {colore.tipo}
          </p>
          <p className="text-sm mt-1">
            Disponibile:{' '}
            <strong className={colore.quantita_disponibile === 0 ? 'text-red-600' : 'text-green-600'}>
              {colore.quantita_disponibile} {colore.unita_misura}
            </strong>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* QUANTITÀ */}
          <div>
            <Label>Quantità ({colore.unita_misura}) *</Label>
            <Input
              type="number"
              step="0.001"
              min="0.001"
              {...register('quantita')}
              placeholder="Es. 2.5"
              autoFocus
            />
            {errors.quantita && (
              <p className="text-red-500 text-xs mt-1">{errors.quantita.message}</p>
            )}
          </div>

          {/* Campi specifici CARICO: DDT + lotto */}
          {isCarico && (
            <>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">📄 Dati consegna</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Numero DDT</Label>
                  <Input {...register('numero_ddt')} placeholder="Es. DDT-001" />
                </div>
                <div>
                  <Label>Data DDT</Label>
                  <Input type="date" {...register('data_ddt')} />
                </div>
              </div>
              <div>
                <Label>Lotto</Label>
                <Input {...register('lotto')} placeholder="Es. LOT-2024-A1" />
              </div>
            </>
          )}


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
