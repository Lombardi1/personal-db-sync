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
import { useAuth } from "@/hooks/useAuth";
import React from "react"; // Importa React
import { WhatsNewModal } from "@/components/WhatsNewModal"; // Importa il nuovo modale
import { currentAppVersion } from "@/config/releaseNotes"; // Importa la versione corrente

const queryClient = new QueryClient();

const App = () => {
  const { user, loading } = useAuth();
  const [showWhatsNewModal, setShowWhatsNewModal] = React.useState(false);

  React.useEffect(() => {
    const lastSeenVersion = localStorage.getItem('lastSeenAppVersion');
    if (lastSeenVersion !== currentAppVersion) {
      setShowWhatsNewModal(true);
    }
  }, []);

  const handleCloseWhatsNewModal = () => {
    localStorage.setItem('lastSeenAppVersion', currentAppVersion);
    setShowWhatsNewModal(false);
  };

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
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      <Sonner /> 
      {showWhatsNewModal && <WhatsNewModal isOpen={showWhatsNewModal} onClose={handleCloseWhatsNewModal} />}
    </QueryClientProvider>
  );
};

export default App;