import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { seedPurchaseOrders } from "./utils/seedData.ts"; // Importa la funzione di seeding

// Controlla la variabile d'ambiente per decidere se eseguire il seeding
if (import.meta.env.VITE_RUN_SEED === 'true') {
  seedPurchaseOrders();
}

createRoot(document.getElementById("root")!).render(<App />);