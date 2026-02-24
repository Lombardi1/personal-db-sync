import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Settings, Calculator, RotateCcw } from 'lucide-react';

const LS_KEY = 'consumo_base_g_m2';
const DEFAULT_BASE = 1.5;

// ─── Tipi ───────────────────────────────────────────────────
interface RisultatoColore {
  nome: string;
  colorStyle: string;
  consumoG: number;
  consumoKg: number;
}

// ─── Utilities ──────────────────────────────────────────────
function formatGrammi(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(3)} kg`;
  return `${g.toFixed(1)} g`;
}

function calcola(
  larghezza: number,
  altezza: number,
  nFogli: number,
  copertura: number,
  baseGm2: number
): number {
  const areaM2 = (larghezza * altezza) / 1_000_000;
  return areaM2 * nFogli * (copertura / 100) * baseGm2;
}

// ─── Componente ─────────────────────────────────────────────
export function CalcoloConsumoColoreTab() {
  // Impostazione consumo base
  const [consumoBase, setConsumoBase] = useState<number>(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? parseFloat(saved) : DEFAULT_BASE;
  });
  const [consumoBaseInput, setConsumoBaseInput] = useState<string>(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved ?? String(DEFAULT_BASE);
  });
  const [mostraImpostazioni, setMostraImpostazioni] = useState(false);

  // Parametri calcolo
  const [larghezza, setLarghezza] = useState<string>('');
  const [altezza, setAltezza] = useState<string>('');
  const [nFogli, setNFogli] = useState<string>('');
  const [copertura, setCopertura] = useState<number>(50);

  // Risultati
  const [risultati, setRisultati] = useState<RisultatoColore[] | null>(null);
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

  const eseguiCalcolo = useCallback(() => {
    const w = parseFloat(larghezza);
    const h = parseFloat(altezza);
    const n = parseFloat(nFogli);

    if (!w || !h || !n || w <= 0 || h <= 0 || n <= 0) return;

    const area = (w * h) / 1_000_000;
    setAreaM2(area);

    const consumoTotaleG = calcola(w, h, n, copertura, consumoBase);
    setTotaleG(consumoTotaleG);

    // Suddivisione CMYK (25% ciascuno del totale)
    const coloriCMYK: RisultatoColore[] = [
      { nome: 'CYAN',    colorStyle: 'bg-cyan-400',   consumoG: consumoTotaleG / 4, consumoKg: consumoTotaleG / 4 / 1000 },
      { nome: 'MAGENTA', colorStyle: 'bg-pink-500',   consumoG: consumoTotaleG / 4, consumoKg: consumoTotaleG / 4 / 1000 },
      { nome: 'YELLOW',  colorStyle: 'bg-yellow-400', consumoG: consumoTotaleG / 4, consumoKg: consumoTotaleG / 4 / 1000 },
      { nome: 'BLACK',   colorStyle: 'bg-gray-800',   consumoG: consumoTotaleG / 4, consumoKg: consumoTotaleG / 4 / 1000 },
    ];
    setRisultati(coloriCMYK);
  }, [larghezza, altezza, nFogli, copertura, consumoBase]);

  // Ricalcola in tempo reale quando cambiano i parametri
  useEffect(() => {
    if (larghezza && altezza && nFogli) {
      eseguiCalcolo();
    } else {
      setRisultati(null);
      setTotaleG(null);
      setAreaM2(null);
    }
  }, [larghezza, altezza, nFogli, copertura, consumoBase]);

  const reset = () => {
    setLarghezza('');
    setAltezza('');
    setNFogli('');
    setCopertura(50);
    setRisultati(null);
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
          <p className="text-sm font-semibold text-amber-800 mb-2">
            ⚙️ Impostazione consumo base
          </p>
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
            <Button
              size="sm"
              onClick={salvaConsumoBase}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Salva
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── FORM INPUT ─── */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-5">
          <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Parametri di stampa
          </p>

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
                <strong>
                  {((parseFloat(larghezza) * parseFloat(altezza)) / 1_000_000).toFixed(4)} m²
                </strong>
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
              <span className="text-2xl font-bold text-[hsl(var(--colori-color))]">
                {copertura}%
              </span>
            </div>
            {/* Barra visiva della copertura */}
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
            <Slider
              min={1}
              max={100}
              step={1}
              value={[copertura]}
              onValueChange={([v]) => setCopertura(v)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1% — Minima</span>
              <span>50% — Media</span>
              <span>100% — Massima</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            className="gap-1.5 text-gray-500"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Azzera
          </Button>
        </div>

        {/* ─── RISULTATI ─── */}
        <div>
          {risultati && totaleG !== null ? (
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
                className="rounded-xl p-5 text-white text-center"
                style={{ background: 'linear-gradient(135deg, hsl(var(--colori-color)), hsl(var(--colori-color-dark)))' }}
              >
                <p className="text-sm opacity-80 mb-1">CONSUMO TOTALE STIMATO</p>
                <p className="text-4xl font-extrabold">{formatGrammi(totaleG)}</p>
                <p className="text-sm opacity-70 mt-1">
                  ({totaleG.toFixed(1)} g = {(totaleG / 1000).toFixed(4)} kg)
                </p>
              </div>

              {/* Suddivisione CMYK */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Suddivisione per colore CMYK (25% ciascuno)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {risultati.map(r => (
                    <div
                      key={r.nome}
                      className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3"
                    >
                      <div className={`w-5 h-5 rounded-full flex-shrink-0 ${r.colorStyle}`} />
                      <div>
                        <p className="font-bold text-sm">{r.nome}</p>
                        <p className="text-xs text-gray-500">{formatGrammi(r.consumoG)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nota */}
              <p className="text-xs text-gray-400 italic">
                * Il calcolo presuppone una distribuzione uniforme del 25% per ciascuno dei 4 colori CMYK.
                Per stampe con colori Pantone o coperture diverse per colore, modifica la copertura di conseguenza.
              </p>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-16 text-center text-gray-400">
              <Calculator className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Inserisci i parametri</p>
              <p className="text-sm mt-1">
                Formato, numero fogli e copertura per ottenere il calcolo
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
