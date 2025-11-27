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
import FustelleDashboard from "./pages/FustelleDashboard"; // Importa la nuova pagina FustelleDashboard
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

            <Route // NUOVA ROTTA PER FUSTELLE
              path="/gestione-fustelle"
              element={renderProtectedRoute(<FustelleDashboard />, ['amministratore'])}
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