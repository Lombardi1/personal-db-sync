/**
 * SchedeTecniche.tsx
 * Elenco di tutte le schede tecniche salvate.
 * Ogni scheda tecnica corrisponde a una riga di db_articoli (non esiste
 * una tabella separata): questa pagina elenca gli articoli ordinati per
 * ultima modifica e permette di riaprirli direttamente nell'editor.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Home, Search, FileText, ChevronRight, ImageIcon } from 'lucide-react'

interface SchedaRow {
  id: string
  cliente: string | null
  codice: string
  linea: string | null
  tipologia: string | null
  updated_at: string | null
  immagine_scheda_url: string | null
}

const PAGE_SIZE = 50

export default function SchedeTecniche() {
  const { loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<SchedaRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (q: string) => {
    setLoading(true)
    let req = supabase
      .from('db_articoli')
      .select('id, cliente, codice, linea, tipologia, updated_at, immagine_scheda_url')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(PAGE_SIZE)

    if (q.length >= 2) {
      req = req.or(`id.ilike.%${q}%,codice.ilike.%${q}%,cliente.ilike.%${q}%,linea.ilike.%${q}%`)
    }

    const { data, error } = await req
    if (!error) setRows((data as SchedaRow[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load(query), 250)
    return () => clearTimeout(t)
  }, [query, load])

  const fmtDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[hsl(210,40%,96%)] flex items-center justify-center">
        <div className="text-lg text-[hsl(var(--muted-foreground))]">Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header title="SCHEDE TECNICHE" />

      <div className="max-w-[98%] mx-auto px-2 py-6 pt-20">

        {/* ── INTESTAZIONE PAGINA ── */}
        <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-1">
              🗂️ Schede Tecniche
            </h1>
            <p className="text-[hsl(var(--muted-foreground))] text-sm">
              Elenco degli articoli con relativa scheda tecnica — ordinati per ultima modifica
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/scheda-tecnica')} size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Nuova scheda
            </Button>
            <Button onClick={() => navigate('/summary')} variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>

        {/* ── RICERCA ── */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cerca per ID, codice articolo o cliente…"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* ── TABELLA ── */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Codice articolo</th>
                  <th className="px-4 py-3">Lavoro / Linea</th>
                  <th className="px-4 py-3">Tipologia</th>
                  <th className="px-4 py-3">Immagine</th>
                  <th className="px-4 py-3">Ultima modifica</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Caricamento…</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nessuna scheda trovata</td></tr>
                )}
                {!loading && rows.map(r => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/scheda-tecnica?id=${encodeURIComponent(r.id)}`)}
                    className="border-b border-gray-100 last:border-0 hover:bg-blue-50 cursor-pointer transition group"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{r.cliente || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{r.codice}</td>
                    <td className="px-4 py-3 text-gray-500">{r.linea || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{r.tipologia || '—'}</td>
                    <td className="px-4 py-3">
                      {r.immagine_scheda_url
                        ? <ImageIcon className="h-4 w-4 text-green-500" />
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(r.updated_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="h-4 w-4 text-blue-400 opacity-0 group-hover:opacity-100 inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && rows.length === PAGE_SIZE && (
            <div className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100">
              Mostrate le prime {PAGE_SIZE} schede — usa la ricerca per affinare i risultati.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
