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
import GestioneFustelle from "./pages/GestioneFustelle"; // Importa la nuova pagina GestioneFustelle
import ChatPage from "./pages/ChatPage"; // NUOVO: Importa la pagina ChatPage
import ProduzioneDashboard from "./pages/ProduzioneDashboard"; // NUOVO: Importa la pagina ProduzioneDashboard
import ConsumoColore from "./pages/ConsumoColore"; // NUOVO: Importa la pagina Consumo Colore
import LavoriStampa from "./pages/LavoriStampa"; // NUOVO: Importa la pagina LavoriStampa
import DBArticoliProduzione from "./pages/DBArticoliProduzione"; // NUOVO: DB Articoli - Produzione
import GeneraDocumenti from "./pages/GeneraDocumenti"; // NUOVO: Genera Scheda / Etichette
import { useAuth } from "@/hooks/useAuth";

const queryClient = new QueryClient();

const App = () => {
  const { user, loading } = useAuth();

  const renderProtectedRoute = (element: React.ReactNode, allowedRoles: ('stampa' | 'amministratore')[]) => {
    return (
      <ProtectedRoute allowedRoles={allowedRoles}>
        {element}
      </ProtectedRoute>
    );
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route 
              path="/" 
              element={
                loading ? (
                  <div className="min-h-screen bg-[hsl(210,40%,96%)] flex items-center justify-center">
                    <div className="text-lg text-[hsl(var(--muted-foreground))]">Caricamento...</div>
                  </div>
                ) : user ? (
                  user.role === 'amministratore' ? <Navigate to="/summary" replace /> : <Navigate to="/stampa-dashboard" replace /> 
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />

            <Route 
              path="/summary" 
              element={renderProtectedRoute(<Summary />, ['amministratore'])}
            />
            
            <Route 
              path="/stampa-dashboard" 
              element={renderProtectedRoute(<StampaDashboard />, ['stampa'])}
            />

            <Route 
              path="/gestione-magazzino" 
              element={renderProtectedRoute(<Index />, ['amministratore', 'stampa'])}
            />
            
            <Route 
              path="/scarico-magazzino-stampa" 
              element={renderProtectedRoute(<Produzione />, ['stampa'])}
            />
            
            <Route 
              path="/gestione-utenti" 
              element={renderProtectedRoute(<GestioneUtenti />, ['amministratore'])} 
            />

            <Route 
              path="/anagrafica"
              element={renderProtectedRoute(<Anagrafica />, ['amministratore'])}
            />

            <Route 
              path="/ordini-acquisto"
              element={renderProtectedRoute(<OrdiniAcquisto />, ['amministratore', 'stampa'])}
            />

            <Route 
              path="/storico-stampa"
              element={renderProtectedRoute(<StoricoStampa />, ['stampa'])}
            />

            <Route
              path="/azienda-info"
              element={renderProtectedRoute(<AziendaInfoPage />, ['amministratore'])}
            />

            <Route
              path="/gestione-fustelle"
              element={renderProtectedRoute(<GestioneFustelle />, ['amministratore'])}
            />

            <Route
              path="/gestione-polimeri"
              element={renderProtectedRoute(<PolimeriDashboard />, ['amministratore'])}
            />

            {/* NUOVO: Rotte per la chat */}
            <Route
              path="/chat"
              element={renderProtectedRoute(<ChatPage />, ['amministratore', 'stampa'])}
            />
            <Route
              path="/chat/:chatId"
              element={renderProtectedRoute(<ChatPage />, ['amministratore', 'stampa'])}
            />

            {/* NUOVO: Rotta per la Produzione Dashboard */}
            <Route
              path="/produzione-dashboard"
              element={renderProtectedRoute(<ProduzioneDashboard />, ['amministratore'])}
            />

            {/* NUOVO: Rotta per Consumo Colore */}
            <Route
              path="/consumo-colore"
              element={renderProtectedRoute(<ConsumoColore />, ['amministratore', 'stampa'])}
            />

            {/* NUOVO: Rotta per Lavori Stampa */}
            <Route
              path="/lavori-stampa"
              element={renderProtectedRoute(<LavoriStampa />, ['amministratore', 'stampa'])}
            />

            {/* NUOVO: Rotta per DB Articoli - Produzione */}
            <Route
              path="/db-articoli-produzione"
              element={renderProtectedRoute(<DBArticoliProduzione />, ['amministratore', 'stampa'])}
            />

            {/* NUOVO: Rotta per Genera Scheda / Etichette */}
            <Route
              path="/genera-documenti"
              element={renderProtectedRoute(<GeneraDocumenti />, ['amministratore', 'stampa'])}
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      <Sonner /> 
    </QueryClientProvider>
  );
};

export default App;