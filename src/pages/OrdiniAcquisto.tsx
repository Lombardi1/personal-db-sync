import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Home, PlusCircle } from 'lucide-react';
import { useOrdiniAcquisto } from '@/hooks/useOrdiniAcquisto';
import { useAnagrafiche } from '@/hooks/useAnagrafiche';
import { useAziendaInfo } from '@/hooks/useAziendaInfo'; // Importa il nuovo hook
import { OrdineAcquisto, ArticoloOrdineAcquisto } from '@/types';
import { ModalOrdineAcquistoForm } from '@/components/modals/ModalOrdineAcquistoForm';
import { TabellaOrdiniAcquisto } from '@/components/tables/TabellaOrdiniAcquisto';
import { Filters } from '@/components/Filters';
import { esportaTabellaXLS, esportaTabellaPDF } from '@/utils/export';
import { generateNextCartoneCode, resetCartoneCodeGenerator, fetchMaxCartoneCodeFromDB } from '@/utils/cartoneUtils';
import * as notifications from '@/utils/notifications'; // Aggiornato a percorso relativo
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function OrdiniAcquisto() {
  const navigate = useNavigate();
  const { 
    ordiniAcquisto, 
    loading, 
    addOrdineAcquisto, 
    updateOrdineAcquisto, 
    cancelOrdineAcquisto,
    deleteOrdineAcquistoPermanently,
    loadOrdiniAcquisto,
    updateOrdineAcquistoStatus,
    updateArticleStatusInOrder
  } = useOrdiniAcquisto();
  const { fornitori, clienti, loading: anagraficheLoading } = useAnagrafiche();
  const { aziendaInfo, loading: aziendaInfoLoading } = useAziendaInfo(); // Usa il nuovo hook

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrdine, setEditingOrdine] = useState<OrdineAcquisto | null>(null);
  const [filtri, setFiltri] = useState({
    numero_ordine: '',
    fornitore_nome: '',
    stato: '',
    data_ordine_filter: '',
    fornitore_tipo: '',
  });
  const [ordiniFiltered, setOrdiniFiltered] = useState<OrdineAcquisto[]>([]);

  const [isDuplicateConfirmOpen, setIsDuplicateConfirmOpen] = useState(false);
  const [ordineToDuplicate, setOrdineToDuplicate] = useState<OrdineAcquisto | null>(null);

  useEffect(() => {
    handleFilter(filtri);
  }, [ordiniAcquisto, filtri]);

  const handleFilter = (newFiltri: typeof filtri) => {
    setFiltri(newFiltri);
    let filtered = ordiniAcquisto;

    Object.entries(newFiltri).forEach(([key, value]) => {
      if (value) {
        if (key === 'data_ordine_filter') {
          filtered = filtered.filter(o => {
            const orderDate = new Date(o.data_ordine);
            const filterValue = String(value).toLowerCase();
            
            const yearMatch = orderDate.getFullYear().toString().includes(filterValue);
            const fullDateMatch = o.data_ordine.includes(filterValue);

            return yearMatch || fullDateMatch;
          });
        } else if (key === 'fornitore_tipo') {
          filtered = filtered.filter(o => {
            return String(o.fornitore_tipo).toLowerCase().includes(value.toLowerCase());
          });
        } else if (key === 'stato') {
          filtered = filtered.filter(o => 
            o.articoli.some(articolo => articolo.stato === value)
          );
        }
        else {
          filtered = filtered.filter(o => {
            const field = o[key as keyof OrdineAcquisto];
            return String(field).toLowerCase().includes(value.toLowerCase());
          });
        }
      }
    });

    setOrdiniFiltered(filtered);
  };

  const resetFiltri = () => {
    const emptyFiltri = {
      numero_ordine: '',
      fornitore_nome: '',
      stato: '',
      data_ordine_filter: '',
      fornitore_tipo: '',
    };
    setFiltri(emptyFiltri);
    handleFilter(emptyFiltri);
  };

  const handleAddClick = () => {
    setEditingOrdine(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (ordine: OrdineAcquisto) => {
    console.log('OrdiniAcquisto: handleEditClick called for order:', ordine.numero_ordine);
    setEditingOrdine(ordine);
    setIsModalOpen(true);
  };

  const handleDuplicateClick = (ordine: OrdineAcquisto) => {
    setOrdineToDuplicate(ordine);
    setIsDuplicateConfirmOpen(true);
  };

  const confirmDuplicateAndEdit = async () => {
    if (!ordineToDuplicate) return;

    console.log('OrdiniAcquisto: confirmDuplicateAndEdit called for order:', ordineToDuplicate.numero_ordine);

    const currentYearShort = new Date().getFullYear().toString().slice(-2);
    const ordersThisYear = ordiniAcquisto.filter(o => 
      o.numero_ordine && o.numero_ordine.endsWith(`/${currentYearShort}`)
    );
    
    let maxSeqNum = 0;
    ordersThisYear.forEach(o => {
      const parts = o.numero_ordine?.split('/');
      if (parts && parts.length === 2) {
        const seqNum = parseInt(parts[0]);
        if (!isNaN(seqNum) && seqNum > maxSeqNum) {
          maxSeqNum = seqNum;
        }
      }
    });
    const nextSeqNum = maxSeqNum + 1;
    const newNumeroOrdine = `${nextSeqNum}/${currentYearShort}`;

    const duplicatedOrder: OrdineAcquisto = JSON.parse(JSON.stringify(ordineToDuplicate));

    duplicatedOrder.id = undefined;
    duplicatedOrder.created_at = undefined;
    duplicatedOrder.numero_ordine = newNumeroOrdine;
    duplicatedOrder.data_ordine = new Date().toISOString().split('T')[0];
    duplicatedOrder.stato = 'in_attesa';

    const fornitore = fornitori.find(f => f.id === duplicatedOrder.fornitore_id);
    const isCartoneFornitore = fornitore?.tipo_fornitore === 'Cartone';

    const maxCodeFromDB = await fetchMaxCartoneCodeFromDB();
    resetCartoneCodeGenerator(maxCodeFromDB);

    duplicatedOrder.articoli = duplicatedOrder.articoli.map(art => {
      const newArticle: ArticoloOrdineAcquisto = { ...art, id: undefined };
      if (isCartoneFornitore) {
        newArticle.codice_ctn = generateNextCartoneCode();
      }
      newArticle.stato = 'in_attesa';
      return newArticle;
    });

    console.log('OrdiniAcquisto: Duplicated order prepared:', duplicatedOrder);
    setEditingOrdine(duplicatedOrder);
    setIsModalOpen(true);
    notifications.showSuccess(`✅ Ordine '${ordineToDuplicate.numero_ordine}' duplicato come '${newNumeroOrdine}'`);
    
    setOrdineToDuplicate(null);
    setIsDuplicateConfirmOpen(false);
  };

  const handleCloseModal = () => {
    console.log('OrdiniAcquisto: handleCloseModal called.');
    setIsModalOpen(false);
    setEditingOrdine(null);
  };

  const handleFormSubmit = async (data: OrdineAcquisto) => {
    // Omit derived fields and internal fields before sending to DB
    const { id, created_at, updated_at, fornitore_nome, fornitore_tipo, ...dataToSave } = data;

    if (editingOrdine?.id) {
      await updateOrdineAcquisto(editingOrdine.id, dataToSave);
    } else {
      await addOrdineAcquisto(dataToSave);
    }
    handleCloseModal();
  };

  if (loading || anagraficheLoading || aziendaInfoLoading) { // Aggiungi aziendaInfoLoading
    return (
      <div className="min-h-screen bg-[hsl(210,40%,96%)] flex items-center justify-center">
        <div className="text-lg text-[hsl(var(--muted-foreground))]">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96%)]">
      <Header
        title="Gestione Ordini d'Acquisto"
        activeTab="ordini-acquisto"
        showUsersButton={true}
      />
      <div className="max-w-[1400px] mx-auto p-3 sm:p-5 md:px-8">
        <div className="flex justify-end mb-4">
          <Button onClick={() => navigate('/summary')} variant="outline" size="sm" className="text-sm">
            <Home className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            Torna alla Dashboard
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-[hsl(var(--ordini-acquisto-color))] flex items-center gap-2 sm:gap-3 text-center sm:text-left">
            <i className="fas fa-shopping-cart"></i> Ordini d'Acquisto
          </h2>
          <Button
            onClick={handleAddClick}
            size="sm"
            className="gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-[hsl(var(--summary-header-color))] hover:bg-[hsl(30,100%,40%)] text-white"
          >
            <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            Nuovo Ordine
          </Button>
        </div>

        <Filters
          filtri={filtri}
          onFilter={handleFilter}
          onReset={resetFiltri}
          matchCount={ordiniFiltered.length}
          sezione="ordini-acquisto"
        />

        {ordiniAcquisto.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-400px)] bg-white rounded-lg shadow-sm p-6 border border-[hsl(var(--border))]">
            <i className="fas fa-box-open h-16 w-16 sm:h-20 sm:w-20 text-[hsl(var(--muted-foreground))] mb-6"></i>
            <p className="text-base sm:text-lg text-[hsl(var(--muted-foreground))] text-center max-w-prose">
              Nessun ordine d'acquisto registrato. Clicca "Nuovo Ordine" per aggiungerne uno.
            </p>
          </div>
        ) : (
          <TabellaOrdiniAcquisto
            ordini={ordiniFiltered}
            onEdit={handleEditClick}
            onCancel={cancelOrdineAcquisto}
            onPermanentDelete={deleteOrdineAcquistoPermanently}
            onDuplicateAndEdit={handleDuplicateClick}
            fornitori={fornitori}
            clienti={clienti}
            aziendaInfo={aziendaInfo} // Passa aziendaInfo
            updateOrdineAcquistoStatus={updateOrdineAcquistoStatus}
            updateArticleStatusInOrder={updateArticleStatusInOrder}
          />
        )}
      </div>

      {isModalOpen && (
        <ModalOrdineAcquistoForm
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleFormSubmit}
          initialData={editingOrdine}
          fornitori={fornitori}
          clienti={clienti}
          // allOrdiniAcquisto={ordiniAcquisto} // REMOVED
        />
      )}

      <AlertDialog open={isDuplicateConfirmOpen} onOpenChange={setIsDuplicateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Duplicazione Ordine</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler duplicare l'ordine <strong>{ordineToDuplicate?.numero_ordine}</strong>?
              Verrà creato un nuovo ordine con i dettagli copiati e un nuovo numero d'ordine.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDuplicateAndEdit}>
              Duplica Ordine
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}