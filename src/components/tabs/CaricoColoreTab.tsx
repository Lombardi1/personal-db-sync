import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Colore } from '@/types';
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
  codice: z.string().min(1, 'Codice obbligatorio'),
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

interface CaricoColoreTabProps {
  aggiungiColore: (colore: Omit<Colore, 'data_creazione' | 'ultima_modifica'>) => Promise<{ error: any }>;
}

export function CaricoColoreTab({ aggiungiColore }: CaricoColoreTabProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo: 'CMYK',
      unita_misura: 'g',
      quantita_disponibile: 0,
    },
  });

  const hexValue = watch('colore_hex');

  const onSubmit = async (data: FormData) => {
    const result = await aggiungiColore({
      codice: data.codice,
      nome: data.nome,
      tipo: data.tipo,
      marca: data.marca || null,
      colore_hex: data.colore_hex || null,
      quantita_disponibile: data.quantita_disponibile,
      unita_misura: data.unita_misura,
      soglia_minima: data.soglia_minima ?? null,
      fornitore: data.fornitore || null,
      note: data.note || null,
      disponibile: true,
    });
    if (!result.error) {
      reset();
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--colori-color))] mb-5 flex items-center gap-2">
        <i className="fas fa-plus-square"></i> Aggiungi Nuovo Colore
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Codice *</Label>
            <Input
              {...register('codice')}
              placeholder="Es. COL001"
              className="font-mono"
            />
            {errors.codice && (
              <p className="text-red-500 text-xs mt-1">{errors.codice.message}</p>
            )}
          </div>
          <div>
            <Label>Tipo *</Label>
            <Select
              defaultValue="CMYK"
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
          <div className="col-span-1 sm:col-span-2">
            <Label>Nome colore *</Label>
            <Input {...register('nome')} placeholder="Es. Ciano Pantone 300 C" />
            {errors.nome && (
              <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>
            )}
          </div>
          <div>
            <Label>Marca</Label>
            <Input {...register('marca')} placeholder="Es. Sun Chemical, Flint..." />
          </div>
          <div>
            <Label>Colore HEX</Label>
            <div className="flex gap-2 items-center">
              <Input
                {...register('colore_hex')}
                placeholder="#00AEEF"
                className="flex-1"
              />
              {hexValue && (
                <div
                  className="w-9 h-9 rounded border border-gray-300 flex-shrink-0"
                  style={{ backgroundColor: hexValue }}
                />
              )}
            </div>
          </div>
          <div>
            <Label>Quantità iniziale *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register('quantita_disponibile')}
            />
            {errors.quantita_disponibile && (
              <p className="text-red-500 text-xs mt-1">{errors.quantita_disponibile.message}</p>
            )}
          </div>
          <div>
            <Label>Unità di misura *</Label>
            <Select
              defaultValue="g"
              onValueChange={v => setValue('unita_misura', v as Colore['unita_misura'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="g">g (grammi)</SelectItem>
                <SelectItem value="kg">kg (chilogrammi)</SelectItem>
                <SelectItem value="l">l (litri)</SelectItem>
                <SelectItem value="ml">ml (millilitri)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Soglia minima (avviso scorta)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register('soglia_minima')}
              placeholder="Es. 500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Riceverai un avviso quando la quantità scende sotto questo valore.
            </p>
          </div>
          <div>
            <Label>Fornitore</Label>
            <Input {...register('fornitore')} placeholder="Nome fornitore" />
          </div>
          <div className="col-span-1 sm:col-span-2">
            <Label>Note</Label>
            <Input {...register('note')} placeholder="Note aggiuntive..." />
          </div>
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[hsl(var(--colori-color))] hover:bg-[hsl(var(--colori-color-dark))] text-white"
        >
          {isSubmitting ? 'Aggiunta in corso...' : '+ Aggiungi Colore'}
        </Button>
      </form>
    </div>
  );
}
