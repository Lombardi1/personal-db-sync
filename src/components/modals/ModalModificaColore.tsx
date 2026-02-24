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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const schema = z.object({
  nome: z.string().min(1, 'Nome obbligatorio'),
  tipo: z.enum(['CMYK', 'Pantone', 'Custom']),
  marca: z.string().optional(),
  quantita_disponibile: z.coerce.number().min(0, 'Quantità non può essere negativa'),
  unita_misura: z.enum(['g', 'kg', 'l', 'ml']),
  soglia_minima: z.coerce.number().optional().nullable(),
  fornitore: z.string().optional(),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ModalModificaColoreProps {
  colore: Colore;
  onClose: () => void;
  onModifica: (codice: string, dati: Partial<Colore>) => Promise<void>;
}

export function ModalModificaColore({ colore, onClose, onModifica }: ModalModificaColoreProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: colore.nome,
      tipo: colore.tipo,
      marca: colore.marca || '',
      quantita_disponibile: colore.quantita_disponibile,
      unita_misura: colore.unita_misura,
      soglia_minima: colore.soglia_minima ?? undefined,
      fornitore: colore.fornitore || '',
      note: colore.note || '',
    },
  });

  const onSubmit = async (data: FormData) => {
    await onModifica(colore.codice, {
      ...data,
      marca: data.marca || null,
      soglia_minima: data.soglia_minima ?? null,
      fornitore: data.fornitore || null,
      note: data.note || null,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifica Colore — {colore.nome}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome colore *</Label>
              <Input {...register('nome')} placeholder="Es. Pantone 485 C" />
              {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select
                defaultValue={colore.tipo}
                onValueChange={v => setValue('tipo', v as Colore['tipo'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CMYK">CMYK</SelectItem>
                  <SelectItem value="Pantone">Pantone</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Marca</Label>
              <Input {...register('marca')} placeholder="Es. Sun Chemical" />
            </div>
            <div>
              <Label>Fornitore</Label>
              <Input {...register('fornitore')} placeholder="Nome fornitore" />
            </div>
            <div>
              <Label>Quantità disponibile *</Label>
              <Input type="number" step="0.001" {...register('quantita_disponibile')} />
              {errors.quantita_disponibile && (
                <p className="text-red-500 text-xs mt-1">{errors.quantita_disponibile.message}</p>
              )}
            </div>
            <div>
              <Label>Unità di misura *</Label>
              <Select
                defaultValue={colore.unita_misura}
                onValueChange={v => setValue('unita_misura', v as Colore['unita_misura'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg (chilogrammi)</SelectItem>
                  <SelectItem value="g">g (grammi)</SelectItem>
                  <SelectItem value="l">l (litri)</SelectItem>
                  <SelectItem value="ml">ml (millilitri)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Soglia minima (avviso)</Label>
              <Input type="number" step="0.001" {...register('soglia_minima')} placeholder="Es. 2" />
            </div>
            <div className="col-span-2">
              <Label>Note</Label>
              <Input {...register('note')} placeholder="Note aggiuntive..." />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[hsl(var(--colori-color))] hover:bg-[hsl(var(--colori-color-dark))] text-white"
            >
              {isSubmitting ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
