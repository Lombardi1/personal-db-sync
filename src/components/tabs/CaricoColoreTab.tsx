import React, { useState } from 'react';
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

const COLORI_CMYK = ['CYAN', 'MAGENTA', 'YELLOW', 'BLACK'];

const schema = z.object({
  nome: z.string().min(1, 'Nome colore obbligatorio'),
  tipo: z.enum(['CMYK', 'Pantone', 'Custom']),
  marca: z.string().optional(),
  quantita_disponibile: z.coerce.number().min(0, 'Quantità non può essere negativa'),
  unita_misura: z.enum(['g', 'kg', 'l', 'ml']),
  soglia_minima: z.coerce.number().optional().nullable(),
  fornitore: z.string().optional(),
  note: z.string().optional(),
  // Campi DDT / lotto (per il primo carico)
  numero_ddt: z.string().optional(),
  data_ddt: z.string().optional(),
  lotto: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CaricoColoreTabProps {
  colori: Colore[];
  nomiPantoneEsistenti: string[];
  aggiungiColore: (
    colore: Omit<Colore, 'data_creazione' | 'ultima_modifica'>,
    caricoInfo?: { numero_ddt?: string; data_ddt?: string; lotto?: string; note?: string }
  ) => Promise<{ error: any }>;
}

export function CaricoColoreTab({ colori, nomiPantoneEsistenti, aggiungiColore }: CaricoColoreTabProps) {
  const [nomeCustom, setNomeCustom] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

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
      unita_misura: 'kg',
      quantita_disponibile: 0,
    },
  });

  const nomeSelezionato = watch('nome');
  const tipoSelezionato = watch('tipo');

  // Codice autogenerato dal nome
  const getCodice = (nome: string) =>
    nome.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '');

  // Opzioni per il select nome: CMYK + Pantone esistenti + "Nuovo..."
  const opzioniPantone = nomiPantoneEsistenti.filter(n => !COLORI_CMYK.includes(n.toUpperCase()));

  const onSubmit = async (data: FormData) => {
    const nomeFinale = data.nome;
    const codice = getCodice(nomeFinale);

    // Controlla se già esiste
    if (colori.find(c => c.codice === codice)) {
      // Esiste già → fai solo un carico sulla giacenza invece di aggiungere
      alert(`Il colore '${nomeFinale}' esiste già. Usa il pulsante + nella giacenza per aggiungere stock.`);
      return;
    }

    const result = await aggiungiColore(
      {
        codice,
        nome: nomeFinale,
        tipo: data.tipo,
        marca: data.marca || null,
        quantita_disponibile: data.quantita_disponibile,
        unita_misura: data.unita_misura,
        soglia_minima: data.soglia_minima ?? null,
        fornitore: data.fornitore || null,
        note: null,
        disponibile: true,
      },
      {
        numero_ddt: data.numero_ddt || undefined,
        data_ddt: data.data_ddt || undefined,
        lotto: data.lotto || undefined,
        note: data.note || undefined,
      }
    );

    if (!result.error) {
      reset({
        tipo: 'CMYK',
        unita_misura: 'kg',
        quantita_disponibile: 0,
      });
      setShowCustomInput(false);
      setNomeCustom('');
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--colori-color))] mb-5 flex items-center gap-2">
        <i className="fas fa-plus-square"></i> Aggiungi Nuovo Colore
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* NOME COLORE — select con CMYK + Pantone esistenti + campo libero */}
          <div className="col-span-1 sm:col-span-2">
            <Label>Colore *</Label>
            {!showCustomInput ? (
              <Select
                onValueChange={v => {
                  if (v === '__nuovo__') {
                    setShowCustomInput(true);
                    setValue('nome', '');
                    // Tipo Pantone di default per nuovi colori custom
                    setValue('tipo', 'Pantone');
                  } else {
                    setValue('nome', v);
                    // Auto-tipo: CMYK se è uno dei 4
                    if (COLORI_CMYK.includes(v.toUpperCase())) {
                      setValue('tipo', 'CMYK');
                    } else {
                      setValue('tipo', 'Pantone');
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona colore..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CYAN" className="font-semibold text-cyan-700">CYAN</SelectItem>
                  <SelectItem value="MAGENTA" className="font-semibold text-pink-700">MAGENTA</SelectItem>
                  <SelectItem value="YELLOW" className="font-semibold text-yellow-700">YELLOW</SelectItem>
                  <SelectItem value="BLACK" className="font-semibold text-gray-800">BLACK</SelectItem>
                  {opzioniPantone.length > 0 && (
                    <>
                      <SelectItem value="__sep__" disabled className="text-xs text-gray-400">── Pantone esistenti ──</SelectItem>
                      {opzioniPantone.map(n => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </>
                  )}
                  <SelectItem value="__sep2__" disabled className="text-xs text-gray-400">──────────────</SelectItem>
                  <SelectItem value="__nuovo__" className="text-[hsl(var(--colori-color))] font-medium">
                    + Nuovo colore Pantone / Custom...
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Es. Pantone 485 C, Pantone Reflex Blue..."
                  value={nomeCustom}
                  onChange={e => {
                    setNomeCustom(e.target.value);
                    setValue('nome', e.target.value);
                  }}
                  autoFocus
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCustomInput(false);
                    setNomeCustom('');
                    setValue('nome', '');
                  }}
                >
                  ✕
                </Button>
              </div>
            )}
            {errors.nome && (
              <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>
            )}
            {nomeSelezionato && (
              <p className="text-xs text-gray-400 mt-1">
                Codice che verrà assegnato: <span className="font-mono font-semibold">{getCodice(nomeSelezionato)}</span>
              </p>
            )}
          </div>

          {/* TIPO */}
          <div>
            <Label>Tipo *</Label>
            <Select
              value={tipoSelezionato}
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

          {/* MARCA */}
          <div>
            <Label>Marca</Label>
            <Input {...register('marca')} placeholder="Es. Sun Chemical, Flint..." />
          </div>

          {/* QUANTITÀ */}
          <div>
            <Label>Quantità iniziale *</Label>
            <Input type="number" step="0.001" min="0" {...register('quantita_disponibile')} />
            {errors.quantita_disponibile && (
              <p className="text-red-500 text-xs mt-1">{errors.quantita_disponibile.message}</p>
            )}
          </div>

          {/* UNITÀ DI MISURA */}
          <div>
            <Label>Unità di misura *</Label>
            <Select
              defaultValue="kg"
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

          {/* SOGLIA MINIMA */}
          <div>
            <Label>Soglia minima (avviso scorta)</Label>
            <Input type="number" step="0.001" min="0" {...register('soglia_minima')} placeholder="Es. 2" />
            <p className="text-xs text-gray-500 mt-1">Avviso quando si scende sotto questo valore.</p>
          </div>

          {/* FORNITORE */}
          <div>
            <Label>Fornitore</Label>
            <Input {...register('fornitore')} placeholder="Nome fornitore" />
          </div>

          {/* SEPARATORE DDT */}
          <div className="col-span-1 sm:col-span-2 border-t border-gray-200 pt-3 mt-1">
            <p className="text-sm font-semibold text-gray-600 mb-3">📄 Dati di consegna (DDT)</p>
          </div>

          {/* NUMERO DDT */}
          <div>
            <Label>Numero DDT</Label>
            <Input {...register('numero_ddt')} placeholder="Es. DDT-2024-001" />
          </div>

          {/* DATA DDT */}
          <div>
            <Label>Data DDT</Label>
            <Input type="date" {...register('data_ddt')} />
          </div>

          {/* LOTTO */}
          <div>
            <Label>Lotto</Label>
            <Input {...register('lotto')} placeholder="Es. LOT-2024-A1" />
          </div>

          {/* NOTE */}
          <div>
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
