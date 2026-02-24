import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Calculator, RotateCcw } from 'lucide-react';

const LS_KEY = 'consumo_base_g_m2';
const DEFAULT_BASE = 1.5;

function formatGrammi(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(3)} kg`;
  return `${g.toFixed(1)} g`;
}

export function CalcoloConsumoColoreTab() {
  const [consumoBase, setConsumoBase] = useState<number>(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? parseFloat(saved) : DEFAULT_BASE;
  });
  const [consumoBaseInput, setConsumoBaseInput] = useState<string>(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved ?? String(DEFAULT_BASE);
  });
  const [mostraImpostazioni, setMostraImpostazioni] = useState(false);

  const [larghezza, setLarghezza] = useState<string>('');
  const [altezza, setAltezza] = useState<string>('');
  const [nFogli, setNFogli] = useState<string>('');
  const [copertura, setCopertura] = useState<number>(50);

  const [totaleG, setTotaleG] = useState<number | null>(null);
  const [areaM2, setAreaM2] = useState<number | null>(null);

  const salvaConsumoBase = () => {
    const val = parseFloat(consumoBaseInput);
    if (!isNaN(val) && val > 0) {
      setConsumoBase(val);
      localStorage.setItem(LS_KEY, String(val));
      setMostraImpostazioni(false);
    }
  };

  useEffect(() => {
    const w = parseFloat(larghezza);
    const h = parseFloat(altezza);
    const n = parseFloat(nFogli);

    if (w > 0 && h > 0 && n > 0) {
      const area = (w * h) / 1_000_000;
      setAreaM2(area);
      setTotaleG(area * n * (copertura / 100) * consumoBase);
    } else {
      setTotaleG(null);
      setAreaM2(null);
    }
  }, [larghezza, altezza, nFogli, copertura, consumoBase]);

  const reset = () => {
    setLarghezza('');
    setAltezza('');
    setNFogli('');
    setCopertura(50);
    setTotaleG(null);
    setAreaM2(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--colori-color))] flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Calcolo Consumo Colore
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMostraImpostazioni(v => !v)}
          className="text-gray-600 gap-1.5"
        >
          <Settings className="h-4 w-4" />
          Consumo base: <strong>{consumoBase} g/m²</strong>
        </Button>
      </div>

      {/* Pannello impostazioni consumo base */}
      {mostraImpostazioni && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-semibold text-amber-800 mb-2">⚙️ Impostazione consumo base</p>
          <p className="text-xs text-amber-700 mb-3">
            Grammi di inchiostro per metro quadro a copertura 100%.
            Valore tipico offset CMYK: 1,5 g/m². Modifica in base al tuo inchiostro specifico.
          </p>
          <div className="flex gap-2 items-center max-w-xs">
            <Input
              type="number"
              step="0.01"
              min="0.1"
              value={consumoBaseInput}
              onChange={e => setConsumoBaseInput(e.target.value)}
              className="flex-1"
              placeholder="Es. 1.5"
            />
            <span className="text-sm text-gray-500 whitespace-nowrap">g/m²</span>
            <Button size="sm" onClick={salvaConsumoBase} className="bg-amber-600 hover:bg-amber-700 text-white">
              Salva
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── FORM INPUT ─── */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-5">
          <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Parametri di stampa</p>

          {/* Formato */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Formato cartone (mm)</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  min="1"
                  placeholder="Larghezza"
                  value={larghezza}
                  onChange={e => setLarghezza(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1 text-center">Larghezza</p>
              </div>
              <span className="text-gray-400 font-bold text-lg">×</span>
              <div className="flex-1">
                <Input
                  type="number"
                  min="1"
                  placeholder="Altezza"
                  value={altezza}
                  onChange={e => setAltezza(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1 text-center">Altezza</p>
              </div>
            </div>
            {larghezza && altezza && (
              <p className="text-xs text-gray-500 mt-1.5">
                Area foglio:{' '}
                <strong>{((parseFloat(larghezza) * parseFloat(altezza)) / 1_000_000).toFixed(4)} m²</strong>
              </p>
            )}
          </div>

          {/* Numero fogli */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Numero fogli</Label>
            <Input
              type="number"
              min="1"
              placeholder="Es. 5000"
              value={nFogli}
              onChange={e => setNFogli(e.target.value)}
            />
          </div>

          {/* Slider copertura */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Copertura</Label>
              <span className="text-2xl font-bold text-[hsl(var(--colori-color))]">{copertura}%</span>
            </div>
            <div className="relative h-8 rounded-full overflow-hidden border border-gray-200 bg-gray-100 mb-3">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${copertura}%`,
                  background: 'linear-gradient(90deg, hsl(var(--colori-color)), hsl(var(--colori-color-dark)))',
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
                {copertura}%
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={copertura}
              onChange={e => setCopertura(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[hsl(var(--colori-color))]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1% — Minima</span>
              <span>50% — Media</span>
              <span>100% — Massima</span>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5 text-gray-500">
            <RotateCcw className="h-3.5 w-3.5" />
            Azzera
          </Button>
        </div>

        {/* ─── RISULTATO ─── */}
        <div>
          {totaleG !== null ? (
            <div className="space-y-4">
              {/* Riepilogo parametri */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-600 space-y-1">
                <p>
                  📐 Formato: <strong>{larghezza} × {altezza} mm</strong>
                  {areaM2 !== null && (
                    <span className="ml-2 text-gray-400">({areaM2.toFixed(4)} m²/foglio)</span>
                  )}
                </p>
                <p>📄 Fogli: <strong>{parseInt(nFogli).toLocaleString('it-IT')}</strong></p>
                <p>🎨 Copertura: <strong>{copertura}%</strong></p>
                <p>⚗️ Consumo base: <strong>{consumoBase} g/m²</strong></p>
              </div>

              {/* Totale */}
              <div
                className="rounded-xl p-6 text-white text-center"
                style={{ background: 'linear-gradient(135deg, hsl(var(--colori-color)), hsl(var(--colori-color-dark)))' }}
              >
                <p className="text-sm opacity-80 mb-1">CONSUMO TOTALE STIMATO</p>
                <p className="text-5xl font-extrabold">{formatGrammi(totaleG)}</p>
                <p className="text-sm opacity-70 mt-2">
                  {totaleG.toFixed(1)} g &nbsp;·&nbsp; {(totaleG / 1000).toFixed(4)} kg
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-16 text-center text-gray-400">
              <Calculator className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Inserisci i parametri</p>
              <p className="text-sm mt-1">Formato, numero fogli e copertura per ottenere il calcolo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
