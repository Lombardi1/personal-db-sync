import React, { useState } from 'react';
import { Colore } from '@/types';
import { Button } from '@/components/ui/button';
import { ModalCaricoScaricoColore } from '@/components/modals/ModalCaricoScaricoColore';
import { Badge } from '@/components/ui/badge';
import { MinusCircle } from 'lucide-react';

interface ScaricoColoreTabProps {
  colori: Colore[];
  scaricoColore: (
    codice: string,
    quantita: number,
    macchina?: string,
    lavoro?: string,
    note?: string
  ) => Promise<{ error: any }>;
}

export function ScaricoColoreTab({ colori, scaricoColore }: ScaricoColoreTabProps) {
  const [coloreSelezionato, setColoreSelezionato] = useState<Colore | null>(null);

  const coloriDisponibili = colori.filter(c => c.disponibile && c.quantita_disponibile > 0);
  const coloriEsauriti = colori.filter(c => c.quantita_disponibile === 0);

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--colori-color))] mb-5 flex items-center gap-2">
        <i className="fas fa-minus-square"></i> Scarico / Consumo Colore
      </h2>
      <p className="text-sm text-gray-600 mb-5">
        Seleziona il colore da scaricare per registrare il consumo.
      </p>

      {coloriDisponibili.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))] py-4">
          Nessun colore disponibile per lo scarico.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coloriDisponibili.map(colore => (
            <div
              key={colore.codice}
              className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {colore.colore_hex && (
                    <div
                      className="w-8 h-8 rounded-full border border-gray-200 flex-shrink-0"
                      style={{ backgroundColor: colore.colore_hex }}
                    />
                  )}
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{colore.nome}</p>
                    <p className="text-xs text-gray-500 font-mono">{colore.codice}</p>
                  </div>
                </div>
                <Badge
                  className={
                    colore.tipo === 'CMYK'
                      ? 'bg-blue-100 text-blue-700 text-xs'
                      : colore.tipo === 'Pantone'
                      ? 'bg-purple-100 text-purple-700 text-xs'
                      : 'bg-gray-100 text-gray-700 text-xs'
                  }
                >
                  {colore.tipo}
                </Badge>
              </div>
              <p className="text-sm mb-1">
                Disponibile:{' '}
                <strong
                  className={
                    colore.soglia_minima && colore.quantita_disponibile <= colore.soglia_minima
                      ? 'text-red-600'
                      : 'text-green-600'
                  }
                >
                  {colore.quantita_disponibile} {colore.unita_misura}
                </strong>
                {colore.soglia_minima && colore.quantita_disponibile <= colore.soglia_minima && (
                  <span className="ml-1 text-xs text-red-500">⚠️</span>
                )}
              </p>
              {colore.marca && (
                <p className="text-xs text-gray-500 mb-3">Marca: {colore.marca}</p>
              )}
              <Button
                size="sm"
                className="w-full bg-[hsl(var(--colori-color))] hover:bg-[hsl(var(--colori-color-dark))] text-white"
                onClick={() => setColoreSelezionato(colore)}
              >
                <MinusCircle className="h-4 w-4 mr-1" />
                Registra Consumo
              </Button>
            </div>
          ))}
        </div>
      )}

      {coloriEsauriti.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-red-600 mb-2">
            ⚠️ Colori esauriti ({coloriEsauriti.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {coloriEsauriti.map(c => (
              <Badge
                key={c.codice}
                className="bg-red-100 text-red-700 border-red-200"
              >
                {c.nome} ({c.codice})
              </Badge>
            ))}
          </div>
        </div>
      )}

      {coloreSelezionato && (
        <ModalCaricoScaricoColore
          colore={coloreSelezionato}
          tipo="scarico"
          onClose={() => setColoreSelezionato(null)}
          onConfirma={async (codice, quantita, extra) => {
            const result = await scaricoColore(codice, quantita, extra.macchina, extra.lavoro, extra.note);
            if (!result.error) setColoreSelezionato(null);
            return result;
          }}
        />
      )}
    </div>
  );
}
