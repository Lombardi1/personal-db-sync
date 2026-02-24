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
  colore_hex: z.string().optional(),
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: colore.nome,
      tipo: colore.tipo,
      marca: colore.marca || '',
      colore_hex: colore.colore_hex || '',
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
      colore_hex: data.colore_hex || null,
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
          <DialogTitle>Modifica Colore — {colore.codice}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome colore *</Label>
              <Input {...register('nome')} placeholder="Es. Ciano Pantone 300" />
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
              <Label>Colore HEX</Label>
              <div className="flex gap-2 items-center">
                <Input
                  {...register('colore_hex')}
                  placeholder="#FF5500"
                  className="flex-1"
                />
                {watch('colore_hex') && (
                  <div
                    className="w-9 h-9 rounded border border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: watch('colore_hex') }}
                  />
                )}
              </div>
            </div>
            <div>
              <Label>Fornitore</Label>
              <Input {...register('fornitore')} placeholder="Nome fornitore" />
            </div>
            <div>
              <Label>Quantità disponibile *</Label>
              <Input type="number" step="0.01" {...register('quantita_disponibile')} />
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
                  <SelectItem value="g">g (grammi)</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="l">l (litri)</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Soglia minima (avviso)</Label>
              <Input
                type="number"
                step="0.01"
                {...register('soglia_minima')}
                placeholder="Es. 500"
              />
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
