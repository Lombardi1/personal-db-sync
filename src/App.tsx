import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Operaio from "./pages/Operaio";
import GestioneUtenti from "./pages/GestioneUtenti";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/hooks/useAuth";
import { GenerateHash } from "@/utils/generateHash";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/generate-hash" element={<GenerateHash />} />
            <Route path="/login" element={<Login />} />
            
            <Route 
              path="/" 
              element={
                <ProtectedRoute allowedRoles={['amministratore']}>
                  <Index />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/operaio" 
              element={
                <ProtectedRoute allowedRoles={['operaio']}>
                  <Operaio />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/gestione-utenti" 
              element={
                <ProtectedRoute allowedRoles={['amministratore']}>
                  <GestioneUtenti />
                </ProtectedRoute>
              } 
            />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
