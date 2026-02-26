import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Search, Plus, Filter, Download, FileText, Home, Eye, EyeOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { AggiuntaRapidaLavoro } from '@/components/AggiuntaRapidaLavoro';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LavoroStampa {
  id: string;
  lotto: number;
  cliente: string;
  lavoro: string;
  identificativo: string | null;
  ordine_nr: string | null;
  data_ordine: string | null;
  formato: string | null;
  quantita: number;
  fogli: string | null;
  fogli_m: string | null;
  data: string;
  note: string | null;
  cartone: string | null;
  taglio: string | null;
  colori: string | null;
  finitura: string | null;
  polimero: string | null;
  fustella: string | null;
  pinza_tg: string | null;
  pvc: string | null;
  inc: string | null;
  cg: string | null;
  mont: string | null;
  stampato: string | null;
  parzialmente: string | null;
  parz_conf: string | null;
  conf: string | null;
  mag: string | null;
  cons: string | null;
  q_x_mod: number | null;
  quantita_scatoloni: number | null;
  scatoloni_usati: number | null;
  tipologia_scatolone: string | null;
  created_at: string;
  updated_at: string;
}

export default function LavoriStampa() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lavori, setLavori] = useState<LavoroStampa[]>([]);
  const [filteredLavori, setFilteredLavori] = useState<LavoroStampa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStato, setFilterStato] = useState<string>('tutti');
  const [nascondiCompletati, setNascondiCompletati] = useState(true);
  const [ordinamentoData, setOrdinamentoData] = useState<'crescente' | 'decrescente'>('decrescente');

  useEffect(() => {
    fetchLavori();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [lavori, searchTerm, filterStato, nascondiCompletati, ordinamentoData]);

  const fetchLavori = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lavori_stampa')
        .select('*')
        .order('lotto', { ascending: false });

      if (error) throw error;

      setLavori(data || []);
    } catch (error: any) {
      console.error('Errore nel caricamento dei lavori:', error);
      toast.error('Errore nel caricamento dei lavori');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...lavori];

    // Filtro completati (MAG + CONS)
    if (nascondiCompletati) {
      filtered = filtered.filter((l) => !(l.mag && l.cons));
    }

    // Filtro ricerca testuale
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (lavoro) =>
          lavoro.lotto.toString().includes(search) ||
          lavoro.cliente.toLowerCase().includes(search) ||
          lavoro.lavoro.toLowerCase().includes(search) ||
          (lavoro.ordine_nr && lavoro.ordine_nr.toLowerCase().includes(search)) ||
          (lavoro.identificativo && lavoro.identificativo.toLowerCase().includes(search))
      );
    }

    // Filtro per stato
    if (filterStato !== 'tutti') {
      switch (filterStato) {
        case 'da_stampare':
          filtered = filtered.filter((l) => !l.stampato);
          break;
        case 'stampato':
          filtered = filtered.filter((l) => l.stampato && !l.conf);
          break;
        case 'confezionato':
          filtered = filtered.filter((l) => l.conf && !l.cons);
          break;
        case 'consegnato':
          filtered = filtered.filter((l) => l.cons);
          break;
      }
    }

    // ORDINAMENTO PER PRIORITÀ: lavori più urgenti in cima
    filtered.sort((a, b) => {
      const prioritaA = getStatoPriorita(a);
      const prioritaB = getStatoPriorita(b);

      // Prima ordina per priorità (1 = urgente, 6 = meno urgente)
      if (prioritaA !== prioritaB) {
        return prioritaA - prioritaB;
      }

      // A parità di priorità, ordina per data
      const dataA = new Date(a.data).getTime();
      const dataB = new Date(b.data).getTime();

      if (ordinamentoData === 'crescente') {
        return dataA - dataB; // Più vecchia prima
      } else {
        return dataB - dataA; // Più recente prima
      }
    });

    setFilteredLavori(filtered);
  };

  const getStatoLabel = (lavoro: LavoroStampa) => {
    if (lavoro.cons) return { label: 'Consegnato', color: 'bg-green-500' };
    if (lavoro.conf) return { label: 'Confezionato', color: 'bg-blue-500' };
    if (lavoro.stampato) return { label: 'Stampato', color: 'bg-yellow-500' };
    return { label: 'Da Stampare', color: 'bg-gray-400' };
  };

  // Colore della riga basato sullo stato del processo
  const getRowColor = (lavoro: LavoroStampa) => {
    if (lavoro.cons) return 'bg-green-200'; // Consegnato - verde (poi nascosto)
    if (lavoro.mag) return 'bg-purple-200'; // In magazzino - viola
    if (lavoro.conf) return 'bg-blue-200'; // Confezionato - blu
    if (lavoro.parzialmente) return 'bg-yellow-200'; // Parzialmente - giallo
    if (lavoro.stampato) return 'bg-green-100'; // Stampato - verde chiaro
    return 'bg-white'; // Da stampare - bianco
  };

  // Priorità visiva: 1 = massima urgenza (da stampare), 6 = minima (consegnato)
  const getStatoPriorita = (lavoro: LavoroStampa): number => {
    if (lavoro.cons) return 6; // Consegnato - priorità minima
    if (lavoro.mag) return 5; // In magazzino
    if (lavoro.conf) return 4; // Confezionato
    if (lavoro.parzialmente) return 3; // Parzialmente
    if (lavoro.stampato) return 2; // Stampato
    return 1; // Da stampare - MASSIMA PRIORITÀ
  };

  const toggleStato = async (lavoro: LavoroStampa, campo: 'cg' | 'mont' | 'stampato' | 'parzialmente' | 'parz_conf' | 'conf' | 'mag' | 'cons') => {
    try {
      const nuovoValore = lavoro[campo] ? null : 'X';

      const { error } = await supabase
        .from('lavori_stampa')
        .update({ [campo]: nuovoValore })
        .eq('id', lavoro.id);

      if (error) throw error;

      // Aggiorna lo stato locale
      setLavori(prevLavori =>
        prevLavori.map(l =>
          l.id === lavoro.id ? { ...l, [campo]: nuovoValore } : l
        )
      );

      toast.success(`Stato aggiornato`);
    } catch (error: any) {
      console.error('Errore aggiornamento stato:', error);
      toast.error('Errore nell\'aggiornamento');
    }
  };

  const exportToPDF = async () => {
    try {
      // Importa jsPDF dinamicamente
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      const doc = new jsPDF('landscape', 'mm', 'a4');

      // Titolo
      doc.setFontSize(16);
      doc.text('Lavori Stampa', 14, 15);
      doc.setFontSize(10);
      doc.text(`Esportato il: ${new Date().toLocaleDateString('it-IT')} - Totale: ${filteredLavori.length} lavori`, 14, 22);

      // Preparazione dati tabella
      const headers = [
        ['Lotto', 'Cliente', 'Lavoro', 'Quantità', 'Data', 'Stato', 'Cartone', 'Colori', 'Finitura', 'Note']
      ];

      const rows = filteredLavori.map(l => [
        l.lotto,
        l.cliente,
        l.lavoro.substring(0, 40), // Limita lunghezza
        l.quantita.toLocaleString(),
        new Date(l.data).toLocaleDateString('it-IT'),
        getStatoLabel(l).label,
        l.cartone || '-',
        l.colori || '-',
        l.finitura || '-',
        (l.note || '-').substring(0, 30) // Limita lunghezza
      ]);

      // Genera tabella
      (doc as any).autoTable({
        startY: 28,
        head: headers,
        body: rows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [147, 51, 234], textColor: 255 }, // Viola
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 15 }, // Lotto
          1: { cellWidth: 35 }, // Cliente
          2: { cellWidth: 50 }, // Lavoro
          3: { cellWidth: 20 }, // Quantità
          4: { cellWidth: 22 }, // Data
          5: { cellWidth: 25 }, // Stato
          6: { cellWidth: 25 }, // Cartone
          7: { cellWidth: 20 }, // Colori
          8: { cellWidth: 25 }, // Finitura
          9: { cellWidth: 35 }, // Note
        },
        margin: { top: 28 },
      });

      // Salva PDF
      doc.save(`lavori_stampa_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF esportato con successo!');
    } catch (error) {
      console.error('Errore export PDF:', error);
      toast.error('Errore durante l\'esportazione PDF');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(210,40%,96%)] flex items-center justify-center">
        <div className="text-lg text-[hsl(var(--muted-foreground))]">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header title="LAVORI STAMPA" />
      <div className="max-w-[98%] mx-auto px-2 py-6 pt-20">
        {/* Header Sezione */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">
              📋 Lavori Stampa
            </h1>
            <p className="text-[hsl(var(--muted-foreground))]">
              Gestione completa dei lavori di stampa - Totale: {filteredLavori.length} lavori
            </p>
          </div>
          <Button
            onClick={() => navigate('/summary')}
            variant="outline"
            size="sm"
          >
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </div>

        {/* Barra Azioni */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col gap-4">
            {/* Prima riga: Ricerca e Filtri */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Ricerca */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cerca per lotto, cliente, lavoro, ordine..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filtro Stato */}
              <Select value={filterStato} onValueChange={setFilterStato}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtra per stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutti gli stati</SelectItem>
                  <SelectItem value="da_stampare">Da Stampare</SelectItem>
                  <SelectItem value="stampato">Stampato</SelectItem>
                  <SelectItem value="confezionato">Confezionato</SelectItem>
                  <SelectItem value="consegnato">Consegnato</SelectItem>
                </SelectContent>
              </Select>

              {/* Ordinamento Data */}
              <Select value={ordinamentoData} onValueChange={(val: 'crescente' | 'decrescente') => setOrdinamentoData(val)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Ordina per data" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="decrescente">Data ↓ (recente)</SelectItem>
                  <SelectItem value="crescente">Data ↑ (vecchia)</SelectItem>
                </SelectContent>
              </Select>

              {/* Pulsanti Azione */}
              <Button
                variant="outline"
                onClick={exportToPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                Esporta PDF
              </Button>
            </div>

            {/* Seconda riga: Toggle Completati */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <button
                onClick={() => setNascondiCompletati(!nascondiCompletati)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  nascondiCompletati
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {nascondiCompletati ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    <span className="text-sm font-medium">Completati nascosti</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    <span className="text-sm font-medium">Mostra tutti (anche completati)</span>
                  </>
                )}
              </button>
              <span className="text-sm text-gray-500">
                {nascondiCompletati
                  ? `Visualizzando ${filteredLavori.length} lavori attivi`
                  : `Visualizzando tutti i ${filteredLavori.length} lavori`
                }
              </span>
            </div>
          </div>
        </div>

        {/* Aggiunta Rapida Lavoro */}
        {user?.role === 'amministratore' && (
          <AggiuntaRapidaLavoro onSuccess={fetchLavori} />
        )}

        {/* Tabella Lavori - Stile Excel */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
            <table className="w-full text-xs border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr className="border-b-2 border-gray-300">
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">Lotto</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">CG</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">MONT</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">Cliente</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap min-w-[180px]">Lavoro</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">Identificativo</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">Ordine Nr</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">Formato</th>
                  <th className="px-1.5 py-1.5 text-right font-semibold border-r border-gray-300 whitespace-nowrap">Quantità</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">Fogli</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">Data</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">Note</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">Cartone</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">Taglio</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">Colori</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">Finitura</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">Polimero</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">Fustella</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">Pinza TG</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">PVC</th>
                  <th className="px-1.5 py-1.5 text-left font-semibold border-r border-gray-300 whitespace-nowrap">INC</th>
                  <th className="px-1.5 py-1.5 text-center font-semibold border-r border-gray-300 whitespace-nowrap">Stampato</th>
                  <th className="px-1.5 py-1.5 text-center font-semibold border-r border-gray-300 whitespace-nowrap">Parz.</th>
                  <th className="px-1.5 py-1.5 text-center font-semibold border-r border-gray-300 whitespace-nowrap">Conf</th>
                  <th className="px-1.5 py-1.5 text-center font-semibold border-r border-gray-300 whitespace-nowrap">Mag</th>
                  <th className="px-1.5 py-1.5 text-center font-semibold border-r border-gray-300 whitespace-nowrap">Cons</th>
                </tr>
              </thead>
              <tbody>
                {filteredLavori.length === 0 ? (
                  <tr>
                    <td colSpan={26} className="text-center py-8 text-gray-500">
                      Nessun lavoro trovato
                    </td>
                  </tr>
                ) : (
                  filteredLavori.map((lavoro, idx) => (
                    <tr key={lavoro.id} className={`border-b border-gray-200 hover:brightness-95 ${getRowColor(lavoro)}`}>
                      <td className="px-1.5 py-1 border-r border-gray-200 font-medium">{lavoro.lotto}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200 text-center">{lavoro.cg || '-'}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200 text-center">{lavoro.mont || '-'}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200">{lavoro.cliente}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200">{lavoro.lavoro}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200">{lavoro.identificativo || '-'}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200">{lavoro.ordine_nr || '-'}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200">{lavoro.formato || '-'}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200 text-right">{lavoro.quantita.toLocaleString()}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200">{lavoro.fogli || '-'}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200 whitespace-nowrap">
                        {new Date(lavoro.data).toLocaleDateString('it-IT')}
                      </td>
                      <td className="px-1.5 py-1 border-r border-gray-200 max-w-[150px] truncate">{lavoro.note || '-'}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200">{lavoro.cartone || '-'}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200">{lavoro.taglio || '-'}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200">{lavoro.colori || '-'}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200">{lavoro.finitura || '-'}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200">{lavoro.polimero || '-'}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200">{lavoro.fustella || '-'}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200">{lavoro.pinza_tg || '-'}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200">{lavoro.pvc || '-'}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200">{lavoro.inc || '-'}</td>
                      <td className="px-1.5 py-1 border-r border-gray-200 text-center">
                        <button
                          onClick={() => toggleStato(lavoro, 'stampato')}
                          className={`inline-block w-5 h-5 rounded cursor-pointer transition-colors hover:opacity-80 ${lavoro.stampato ? 'bg-green-500' : 'bg-gray-200'}`}
                          title={lavoro.stampato ? 'Clicca per rimuovere' : 'Clicca per segnare come stampato'}
                        />
                      </td>
                      <td className="px-1.5 py-1 border-r border-gray-200 text-center">
                        <button
                          onClick={() => toggleStato(lavoro, 'parzialmente')}
                          className={`inline-block w-5 h-5 rounded cursor-pointer transition-colors hover:opacity-80 ${lavoro.parzialmente ? 'bg-yellow-500' : 'bg-gray-200'}`}
                          title={lavoro.parzialmente ? 'Clicca per rimuovere' : 'Clicca per segnare come parziale'}
                        />
                      </td>
                      <td className="px-1.5 py-1 border-r border-gray-200 text-center">
                        <button
                          onClick={() => toggleStato(lavoro, 'conf')}
                          className={`inline-block w-5 h-5 rounded cursor-pointer transition-colors hover:opacity-80 ${lavoro.conf ? 'bg-blue-500' : 'bg-gray-200'}`}
                          title={lavoro.conf ? 'Clicca per rimuovere' : 'Clicca per segnare come confezionato'}
                        />
                      </td>
                      <td className="px-1.5 py-1 border-r border-gray-200 text-center">
                        <button
                          onClick={() => toggleStato(lavoro, 'mag')}
                          className={`inline-block w-5 h-5 rounded cursor-pointer transition-colors hover:opacity-80 ${lavoro.mag ? 'bg-purple-500' : 'bg-gray-200'}`}
                          title={lavoro.mag ? 'Clicca per rimuovere' : 'Clicca per segnare in magazzino'}
                        />
                      </td>
                      <td className="px-1.5 py-1 border-r border-gray-200 text-center">
                        <button
                          onClick={() => toggleStato(lavoro, 'cons')}
                          className={`inline-block w-5 h-5 rounded cursor-pointer transition-colors hover:opacity-80 ${lavoro.cons ? 'bg-green-600' : 'bg-gray-200'}`}
                          title={lavoro.cons ? 'Clicca per rimuovere' : 'Clicca per segnare come consegnato'}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Statistiche */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-700">
                {lavori.filter(l => !l.stampato).length}
              </div>
              <div className="text-sm text-gray-500">Da Stampare</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {lavori.filter(l => l.stampato && !l.conf).length}
              </div>
              <div className="text-sm text-gray-500">Stampati</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {lavori.filter(l => l.conf && !l.cons).length}
              </div>
              <div className="text-sm text-gray-500">Confezionati</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {lavori.filter(l => l.cons).length}
              </div>
              <div className="text-sm text-gray-500">Consegnati</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
