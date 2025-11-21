import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AziendaInfo } from '@/types';
import { Building2 } from 'lucide-react';

interface AziendaTabProps {
  aziendaInfo: AziendaInfo | null;
  updateAziendaInfo: (data: Partial<AziendaInfo>) => Promise<{ success: boolean; error?: any }>;
}

const aziendaInfoSchema = z.object({
  nome_azienda: z.string().min(1, 'Il nome dell\'azienda è obbligatorio').max(255, 'Nome troppo lungo'),
  indirizzo: z.string().max(255, 'Indirizzo troppo lungo').optional().or(z.literal('')),
  citta: z.string().max(100, 'Città troppo lunga').optional().or(z.literal('')),
  cap: z.string().max(10, 'CAP troppo lungo').optional().or(z.literal('')),
  provincia: z.string().max(50, 'Provincia troppo lunga').optional().or(z.literal('')),
  telefono: z.string().max(50, 'Telefono troppo lungo').optional().or(z.literal('')),
  fax: z.string().max(50, 'Fax troppo lungo').optional().or(z.literal('')),
  email: z.string().email('Email non valida').max(255, 'Email troppo lunga').optional().or(z.literal('')),
  p_iva: z.string().max(20, 'Partita IVA troppo lunga').optional().or(z.literal('')),
  codice_fiscale: z.string().max(20, 'Codice Fiscale troppo lungo').optional().or(z.literal('')),
  rea: z.string().max(50, 'REA troppo lungo').optional().or(z.literal('')),
  m_bs: z.string().max(50, 'M. BS troppo lungo').optional().or(z.literal('')),
  banche: z.string().max(1000, 'Banche troppo lunghe').optional().or(z.literal('')),
});

export function AziendaTab({ aziendaInfo, updateAziendaInfo }: AziendaTabProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AziendaInfo>({
    resolver: zodResolver(aziendaInfoSchema),
    defaultValues: {
      nome_azienda: '',
      indirizzo: '',
      citta: '',
      cap: '',
      provincia: '',
      telefono: '',
      fax: '',
      email: '',
      p_iva: '',
      codice_fiscale: '',
      rea: '',
      m_bs: '',
      banche: '',
      ...aziendaInfo, // Popola con i dati esistenti
    },
  });

  React.useEffect(() => {
    // Resetta il form quando aziendaInfo cambia
    reset({
      nome_azienda: '',
      indirizzo: '',
      citta: '',
      cap: '',
      provincia: '',
      telefono: '',
      fax: '',
      email: '',
      p_iva: '',
      codice_fiscale: '',
      rea: '',
      m_bs: '',
      banche: '',
      ...aziendaInfo,
    });
  }, [aziendaInfo, reset]);

  const onSubmit = async (data: AziendaInfo) => {
    // Rimuovi id, created_at, updated_at prima di inviare i dati
    const { id, created_at, updated_at, ...dataToSave } = data;
    await updateAziendaInfo(dataToSave);
  };

  return (
    <div className="p-4">
      <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--anagrafica-color))] flex items-center gap-2 mb-4">
        <Building2 className="h-6 w-6" /> Informazioni Azienda
      </h3>
      <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))] mb-6">
        Gestisci le informazioni della tua azienda che verranno utilizzate nei documenti.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* Dettagli principali */}
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border p-4 rounded-lg bg-gray-50">
          <div className="md:col-span-2">
            <Label htmlFor="nome_azienda">Nome Azienda *</Label>
            <Input id="nome_azienda" {...register('nome_azienda')} />
            {errors.nome_azienda && <p className="text-destructive text-xs mt-1">{errors.nome_azienda.message}</p>}
          </div>
          <div>
            <Label htmlFor="indirizzo">Indirizzo</Label>
            <Input id="indirizzo" {...register('indirizzo')} />
            {errors.indirizzo && <p className="text-destructive text-xs mt-1">{errors.indirizzo.message}</p>}
          </div>
          <div>
            <Label htmlFor="citta">Città</Label>
            <Input id="citta" {...register('citta')} />
            {errors.citta && <p className="text-destructive text-xs mt-1">{errors.citta.message}</p>}
          </div>
          <div>
            <Label htmlFor="cap">CAP</Label>
            <Input id="cap" {...register('cap')} />
            {errors.cap && <p className="text-destructive text-xs mt-1">{errors.cap.message}</p>}
          </div>
          <div>
            <Label htmlFor="provincia">Provincia</Label>
            <Input id="provincia" {...register('provincia')} />
            {errors.provincia && <p className="text-destructive text-xs mt-1">{errors.provincia.message}</p>}
          </div>
        </div>

        {/* Contatti */}
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border p-4 rounded-lg bg-gray-50">
          <h4 className="md:col-span-2 text-base font-semibold mb-2">Contatti</h4>
          <div>
            <Label htmlFor="telefono">Telefono</Label>
            <Input id="telefono" {...register('telefono')} />
            {errors.telefono && <p className="text-destructive text-xs mt-1">{errors.telefono.message}</p>}
          </div>
          <div>
            <Label htmlFor="fax">Fax</Label>
            <Input id="fax" {...register('fax')} />
            {errors.fax && <p className="text-destructive text-xs mt-1">{errors.fax.message}</p>}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
          </div>
        </div>

        {/* Dati fiscali e legali */}
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border p-4 rounded-lg bg-gray-50">
          <h4 className="md:col-span-2 text-base font-semibold mb-2">Dati Fiscali e Legali</h4>
          <div>
            <Label htmlFor="p_iva">Partita IVA</Label>
            <Input id="p_iva" {...register('p_iva')} />
            {errors.p_iva && <p className="text-destructive text-xs mt-1">{errors.p_iva.message}</p>}
          </div>
          <div>
            <Label htmlFor="codice_fiscale">Codice Fiscale</Label>
            <Input id="codice_fiscale" {...register('codice_fiscale')} />
            {errors.codice_fiscale && <p className="text-destructive text-xs mt-1">{errors.codice_fiscale.message}</p>}
          </div>
          <div>
            <Label htmlFor="rea">R.E.A.</Label>
            <Input id="rea" {...register('rea')} />
            {errors.rea && <p className="text-destructive text-xs mt-1">{errors.rea.message}</p>}
          </div>
          <div>
            <Label htmlFor="m_bs">M. BS</Label>
            <Input id="m_bs" {...register('m_bs')} />
            {errors.m_bs && <p className="text-destructive text-xs mt-1">{errors.m_bs.message}</p>}
          </div>
        </div>

        {/* Banche */}
        <div className="md:col-span-2 border p-4 rounded-lg bg-gray-50">
          <Label htmlFor="banche">Banche</Label>
          <Textarea id="banche" {...register('banche')} rows={3} />
          {errors.banche && <p className="text-destructive text-xs mt-1">{errors.banche.message}</p>}
        </div>

        <div className="md:col-span-2 flex justify-end mt-4">
          <Button type="submit" disabled={isSubmitting} className="bg-[hsl(var(--anagrafica-color))] hover:bg-[hsl(25,95%,45%)] text-white">
            {isSubmitting ? 'Salvataggio...' : 'Salva Informazioni Azienda'}
          </Button>
        </div>
      </form>
    </div>
  );
}