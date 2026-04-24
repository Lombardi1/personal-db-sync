import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Produzione from "./pages/Produzione";
import GestioneUtenti from "./pages/GestioneUtenti";
import NotFound from "./pages/NotFound";
import Summary from "./pages/Summary";
import StampaDashboard from "./pages/StampaDashboard";
import Anagrafica from "./pages/Anagrafica";
import OrdiniAcquisto from "./pages/OrdiniAcquisto";
import StoricoStampa from "./pages/StoricoStampa";
import AziendaInfoPage from "./pages/AziendaInfo";
import FustelleDashboard from "./pages/FustelleDashboard";
import PolimeriDashboard from "./pages/PolimeriDashboard";
import GestioneFustelle from "./pages/GestioneFustelle";
import ChatPage from "./pages/ChatPage";
import ProduzioneDashboard from "./pages/ProduzioneDashboard";
import ConsumoColore from "./pages/ConsumoColore";
import LavoriStampa from "./pages/LavoriStampa";
import DBArticoliProduzione from "./pages/DBArticoliProduzione";
import GeneraDocumenti from "./pages/GeneraDocumenti";
import MacchinaView from "./pages/MacchinaView";
import SelezioneMacchina from "./pages/SelezioneMacchina";
import OrdiniCartone from "./pages/OrdiniCartone";
import { useAuth } from "@/hooks/useAuth";

const queryClient = new QueryClient();

// Redirect iniziale basato sul ruolo
function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(210,40%,96%)] flex items-center justify-center">
        <div className="text-lg text-[hsl(var(--muted-foreground))]">Caricamento...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'amministratore') return <Navigate to="/summary" replace />;
  if (user.role === 'macchina' && user.macchina_id) return <Navigate to={`/macchina/${user.macchina_id}`} replace />;
  return <Navigate to="/stampa-dashboard" replace />;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<HomeRedirect />} />

            {/* Admin */}
            <Route path="/summary" element={<ProtectedRoute allowedRoles={['amministratore']}><Summary /></ProtectedRoute>} />
            <Route path="/gestione-magazzino" element={<ProtectedRoute allowedRoles={['amministratore', 'stampa']}><Index /></ProtectedRoute>} />
            <Route path="/gestione-utenti" element={<ProtectedRoute allowedRoles={['amministratore']}><GestioneUtenti /></ProtectedRoute>} />
            <Route path="/anagrafica" element={<ProtectedRoute allowedRoles={['amministratore']}><Anagrafica /></ProtectedRoute>} />
            <Route path="/ordini-acquisto" element={<ProtectedRoute allowedRoles={['amministratore']}><OrdiniAcquisto /></ProtectedRoute>} />
            <Route path="/azienda-info" element={<ProtectedRoute allowedRoles={['amministratore']}><AziendaInfoPage /></ProtectedRoute>} />
            <Route path="/gestione-fustelle" element={<ProtectedRoute allowedRoles={['amministratore']}><GestioneFustelle /></ProtectedRoute>} />
            <Route path="/gestione-polimeri" element={<ProtectedRoute allowedRoles={['amministratore']}><PolimeriDashboard /></ProtectedRoute>} />
            <Route path="/produzione-dashboard" element={<ProtectedRoute allowedRoles={['amministratore']}><ProduzioneDashboard /></ProtectedRoute>} />
            <Route path="/gestione-produzione" element={<ProtectedRoute allowedRoles={['amministratore']}><ProduzioneDashboard /></ProtectedRoute>} />
            <Route path="/ordini-cartone" element={<ProtectedRoute allowedRoles={['amministratore', 'stampa']}><OrdiniCartone /></ProtectedRoute>} />


            {/* Stampa (KBA) */}
            <Route path="/stampa-dashboard" element={<ProtectedRoute allowedRoles={['stampa']}><StampaDashboard /></ProtectedRoute>} />
            <Route path="/scarico-magazzino-stampa" element={<ProtectedRoute allowedRoles={['stampa']}><Produzione /></ProtectedRoute>} />
            <Route path="/storico-stampa" element={<ProtectedRoute allowedRoles={['stampa']}><StoricoStampa /></ProtectedRoute>} />
            <Route path="/consumo-colore" element={<ProtectedRoute allowedRoles={['stampa', 'amministratore']}><ConsumoColore /></ProtectedRoute>} />
            <Route path="/lavori-stampa" element={<ProtectedRoute allowedRoles={['stampa', 'amministratore']}><LavoriStampa /></ProtectedRoute>} />
            <Route path="/db-articoli-produzione" element={<ProtectedRoute allowedRoles={['stampa', 'amministratore']}><DBArticoliProduzione /></ProtectedRoute>} />
            <Route path="/genera-documenti" element={<ProtectedRoute allowedRoles={['stampa', 'amministratore']}><GeneraDocumenti /></ProtectedRoute>} />

            {/* Chat — tutti */}
            <Route path="/chat" element={<ProtectedRoute allowedRoles={['amministratore', 'stampa']}><ChatPage /></ProtectedRoute>} />
            <Route path="/chat/:chatId" element={<ProtectedRoute allowedRoles={['amministratore', 'stampa']}><ChatPage /></ProtectedRoute>} />

            {/* Macchine — ruolo macchina + admin */}
            <Route path="/macchina/:macchinaId" element={<ProtectedRoute allowedRoles={['macchina', 'amministratore']}><MacchinaView /></ProtectedRoute>} />
            <Route path="/selezione-macchina" element={<ProtectedRoute allowedRoles={['amministratore']}><SelezioneMacchina /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      <Sonner />
    </QueryClientProvider>
  );
};

export default App;
