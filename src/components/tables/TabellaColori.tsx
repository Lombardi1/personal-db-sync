import React from 'react';
import { Colore } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Trash2, MinusCircle, PlusCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface TabellaColoriProps {
  colori: Colore[];
  onEdit: (colore: Colore) => void;
  onDelete: (codice: string) => void;
  onChangeDisponibilita: (codice: string, disponibile: boolean) => Promise<{ error: any }>;
  onScarico: (colore: Colore) => void;
  onCarico: (colore: Colore) => void;
}

function getBadgeTipo(tipo: Colore['tipo']) {
  switch (tipo) {
    case 'CMYK':
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">CMYK</Badge>;
    case 'Pantone':
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Pantone</Badge>;
    case 'Custom':
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Custom</Badge>;
    default:
      return <Badge variant="outline">{tipo}</Badge>;
  }
}

function getQuantitaStyle(colore: Colore) {
  if (colore.quantita_disponibile === 0) return 'text-red-700 font-bold';
  if (colore.soglia_minima && colore.quantita_disponibile <= colore.soglia_minima) return 'text-orange-600 font-bold';
  return 'text-green-700 font-semibold';
}

// Badge colore nome per CMYK
function getNomeBadgeStyle(nome: string) {
  switch (nome.toUpperCase()) {
    case 'CYAN': return 'bg-cyan-100 text-cyan-800 border-cyan-300';
    case 'MAGENTA': return 'bg-pink-100 text-pink-800 border-pink-300';
    case 'YELLOW': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'BLACK': return 'bg-gray-200 text-gray-900 border-gray-400';
    default: return null;
  }
}

export function TabellaColori({
  colori,
  onEdit,
  onDelete,
  onChangeDisponibilita,
  onScarico,
  onCarico,
}: TabellaColoriProps) {
  const { isAmministratore } = useAuth();

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs font-semibold uppercase text-gray-600">Colore</TableHead>
            <TableHead className="text-xs font-semibold uppercase text-gray-600">Tipo</TableHead>
            <TableHead className="text-xs font-semibold uppercase text-gray-600">Marca</TableHead>
            <TableHead className="text-xs font-semibold uppercase text-gray-600">Quantità</TableHead>
            <TableHead className="text-xs font-semibold uppercase text-gray-600">Fornitore</TableHead>
            <TableHead className="text-xs font-semibold uppercase text-gray-600">Stato</TableHead>
            <TableHead className="text-xs font-semibold uppercase text-gray-600 text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {colori.map(colore => {
            const cmykStyle = getNomeBadgeStyle(colore.nome);
            return (
              <TableRow key={colore.codice} className={!colore.disponibile ? 'opacity-50' : ''}>
                <TableCell>
                  <div>
                    {cmykStyle ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold border ${cmykStyle}`}>
                        {colore.nome}
                      </span>
                    ) : (
                      <span className="font-medium text-gray-800">{colore.nome}</span>
                    )}
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{colore.codice}</p>
                  </div>
                </TableCell>
                <TableCell>{getBadgeTipo(colore.tipo)}</TableCell>
                <TableCell className="text-sm text-gray-600">{colore.marca || '—'}</TableCell>
                <TableCell>
                  <span className={getQuantitaStyle(colore)}>
                    {colore.quantita_disponibile} {colore.unita_misura}
                  </span>
                  {colore.soglia_minima && colore.quantita_disponibile <= colore.soglia_minima && (
                    <span className="ml-1 text-xs text-orange-500">⚠️ Sotto soglia</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-gray-600">{colore.fornitore || '—'}</TableCell>
                <TableCell>
                  <Badge
                    className={
                      colore.disponibile
                        ? 'bg-green-100 text-green-800 border-green-200 cursor-pointer hover:bg-green-200'
                        : 'bg-red-100 text-red-800 border-red-200 cursor-pointer hover:bg-red-200'
                    }
                    onClick={() => onChangeDisponibilita(colore.codice, !colore.disponibile)}
                  >
                    {colore.disponibile ? 'Disponibile' : 'Non Disponibile'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 p-1 h-7 w-7"
                      onClick={() => onCarico(colore)}
                      title="Carico"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200 p-1 h-7 w-7"
                      onClick={() => onScarico(colore)}
                      title="Scarico / Consumo"
                    >
                      <MinusCircle className="h-3.5 w-3.5" />
                    </Button>
                    {isAmministratore && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 p-1 h-7 w-7"
                          onClick={() => onEdit(colore)}
                          title="Modifica"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 p-1 h-7 w-7"
                          onClick={() => onDelete(colore.codice)}
                          title="Elimina"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
