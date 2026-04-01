import React, { useState, useEffect } from 'react';
import { Polimero } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import * as notifications from '@/utils/notifications';
import { findNextAvailablePolimeroCode } from '@/utils/polimeroUtils';
import { supabase } from '@/lib/supabase';

interface CaricoPolimeroTabProps {
  aggiungiPolimero: (polimero: Omit<Polimero, 'data_creazione' | 'ultima_modifica'>) => Promise<{ error: any }>;
}

export function CaricoPolimeroTab({ aggiungiPolimero }: CaricoPolimeroTabProps) {
  const [formData, setFormData] = useState({
    codice: 'PLM-001',
    nr_fustella: '',
    codice_fornitore: '',
    cliente: '',
    lavoro: '',
    resa: '',
    note: '',
    disponibile: true,
  });
  const [isFetchingFustella, setIsFetchingFustella] = useState(false);

  useEffect(() => {
    const initializeAndGenerateCode = async () => {
      const nextCode = await findNextAvailablePolimeroCode();
      setFormData(prev => ({ ...prev, codice: nextCode }));
    };
    initializeAndGenerateCode();
  }, []);

  // Precompila i campi dalla fustella in base al Codice Fornitore (se già catalogata)
  useEffect(() => {
    const fetchFustellaData = async () => {
      const fornitoreCode = formData.codice_fornitore.trim();
      if (fornitoreCode) {
        setIsFetchingFustella(true);
        try {
          const { data, error } = await supabase
            .from('fustelle')
            .select('codice, cliente, lavoro, resa')
            .eq('codice_fornitore', fornitoreCode)
            .limit(1);

          if (error) throw error;

          if (data && data.length > 0) {
            const fustellaData = data[0];
            setFormData(prev => ({
              ...prev,
              nr_fustella: fustellaData.codice || '',
              cliente: fustellaData.cliente || '',
              lavoro: fustellaData.lavoro || '',
              resa: fustellaData.resa || '',
            }));
            notifications.showInfo(`Fustella trovata: dati precompilati.`);
          } else {
            // Fustella non ancora catalogata: pulisce nr_fustella ma lascia gli altri campi
            setFormData(prev => ({
              ...prev,
              nr_fustella: '',
            }));
            notifications.showInfo(`Fustella non ancora catalogata — verrà collegata automaticamente quando verrà aggiunta.`);
          }
        } catch (error: any) {
          notifications.showError(`Errore nel recupero dati fustella: ${error.message}`);
        } finally {
          setIsFetchingFustella(false);
        }
      } else {
        setFormData(prev => ({
          ...prev,
          nr_fustella: '',
          cliente: '',
          lavoro: '',
          resa: '',
        }));
      }
    };

    const timeoutId = setTimeout(fetchFustellaData, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.codice_fornitore]);

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // nr_fustella non è obbligatorio: verrà collegato automaticamente quando la fustella verrà catalogata
    if (!formData.codice_fornitore || !formData.cliente || !formData.lavoro || !formData.resa) {
      notifications.showError('⚠️ Compila tutti i campi obbligatori (*)');
      return;
    }

    const nuovoPolimero: Omit<Polimero, 'data_creazione' | 'ultima_modifica'> = {
      codice: formData.codice,
      nr_fustella: formData.nr_fustella.trim() || null,
      codice_fornitore: formData.codice_fornitore.trim() || null,
      cliente: formData.cliente.trim() || null,
      lavoro: formData.lavoro.trim() || null,
      resa: formData.resa.trim() || null,
      note: formData.note.trim() || null,
      disponibile: formData.disponibile,
    };

    const { error } = await aggiungiPolimero(nuovoPolimero);
    if (!error) {
      notifications.showSuccess(`✅ Polimero '${formData.codice}' registrato con successo!`);
      const nextCode = await findNextAvailablePolimeroCode();
      setFormData({
        codice: nextCode,
        nr_fustella: '',
        codice_fornitore: '',
        cliente: '',
        lavoro: '',
        resa: '',
        note: '',
        disponibile: true,
      });
    } else {
      notifications.showError('Errore durante il salvataggio del polimero');
    }
  };

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--polimeri-color))] mb-4 sm:mb-5 flex items-center gap-2">
        <i className="fas fa-plus-square"></i> Carica Nuovo Polimero
      </h2>
      <form onSubmit={handleSubmit} className="bg-[hsl(210,40%,98%)] rounded-lg p-4 sm:p-6 border border-[hsl(var(--border))]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <Label htmlFor="codice" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-barcode mr-1"></i> Codice (auto)
            </Label>
            <Input id="codice" type="text" value={formData.codice} disabled
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md bg-gray-100 text-xs sm:text-sm font-mono font-bold" />
          </div>
          <div>
            <Label htmlFor="codice_fornitore" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-id-card mr-1"></i> Codice Fornitore *
            </Label>
            <Input id="codice_fornitore" type="text" value={formData.codice_fornitore}
              onChange={(e) => handleChange('codice_fornitore', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--polimeri-color))] focus:ring-2 focus:ring-[hsl(var(--polimeri-color))]/10"
              placeholder="es. FOR-001" required disabled={isFetchingFustella} />
          </div>
          <div>
            <Label htmlFor="nr_fustella" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-hashtag mr-1"></i> Nr. Fustella
              {!formData.nr_fustella && formData.codice_fornitore && (
                <span className="ml-2 text-xs text-amber-500 font-normal">(si collegherà automaticamente)</span>
              )}
            </Label>
            <Input id="nr_fustella" type="text" value={formData.nr_fustella}
              onChange={(e) => handleChange('nr_fustella', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--polimeri-color))] focus:ring-2 focus:ring-[hsl(var(--polimeri-color))]/10"
              placeholder="Auto — compilato se fustella già catalogata"
              disabled={isFetchingFustella} />
          </div>
          <div>
            <Label htmlFor="cliente" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-user mr-1"></i> Cliente *
            </Label>
            <Input id="cliente" type="text" value={formData.cliente}
              onChange={(e) => handleChange('cliente', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--polimeri-color))] focus:ring-2 focus:ring-[hsl(var(--polimeri-color))]/10"
              placeholder="es. Cliente Alpha" required disabled={isFetchingFustella} />
          </div>
          <div>
            <Label htmlFor="lavoro" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-briefcase mr-1"></i> Lavoro *
            </Label>
            <Input id="lavoro" type="text" value={formData.lavoro}
              onChange={(e) => handleChange('lavoro', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--polimeri-color))] focus:ring-2 focus:ring-[hsl(var(--polimeri-color))]/10"
              placeholder="es. LAV-2025-001" required disabled={isFetchingFustella} />
          </div>
          <div>
            <Label htmlFor="resa" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-chart-line mr-1"></i> Resa *
            </Label>
            <Input id="resa" type="text" value={formData.resa}
              onChange={(e) => handleChange('resa', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--polimeri-color))] focus:ring-2 focus:ring-[hsl(var(--polimeri-color))]/10"
              placeholder="es. 1/2" required disabled={isFetchingFustella} />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <Label htmlFor="note" className="block font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
              <i className="fas fa-sticky-note mr-1"></i> Note
            </Label>
            <Textarea id="note" value={formData.note}
              onChange={(e) => handleChange('note', e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 border border-[hsl(var(--border))] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[hsl(var(--polimeri-color))] focus:ring-2 focus:ring-[hsl(var(--polimeri-color))]/10"
              rows={3} placeholder="Note opzionali..." />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.disponibile}
                onChange={(e) => handleChange('disponibile', e.target.checked)}
                className="toggle-checkbox" id="polimero-disponibile" />
              <label htmlFor="polimero-disponibile" className="toggle-label">
                <span className="toggle-ball"></span>
              </label>
              <span className="text-xs sm:text-sm font-medium">Disponibile</span>
            </label>
          </div>
        </div>
        <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
          <Button type="submit"
            className="bg-[hsl(var(--polimeri-color))] text-white hover:bg-[hsl(var(--polimeri-color-dark))] px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base"
            disabled={isFetchingFustella}>
            <i className="fas fa-save mr-1 sm:mr-2"></i> Salva Polimero
          </Button>
          <Button type="button" onClick={async () => {
            const nextCode = await findNextAvailablePolimeroCode();
            setFormData({ codice: nextCode, nr_fustella: '', codice_fornitore: '', cliente: '', lavoro: '', resa: '', note: '', disponibile: true });
          }}
            className="bg-[hsl(210,40%,96%)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(214,32%,91%)] px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base"
            disabled={isFetchingFustella}>
            <i className="fas fa-eraser mr-1 sm:mr-2"></i> Pulisci Form
          </Button>
        </div>
      </form>
    </div>
  );
}
