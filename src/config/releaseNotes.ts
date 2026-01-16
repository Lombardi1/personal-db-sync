export const currentAppVersion = "1.2.0"; // Nuova versione

export const releaseNotes = [
  {
    version: "1.2.0",
    date: "2024-08-02",
    title: "Nuova Gestione Visualizzazione Novità",
    features: [
      "**Numero di Versione in Basso a Sinistra:** Aggiunto il numero di versione in basso a sinistra su tutte le dashboard. Cliccando su di esso si aprirà un dialog con le novità dell'applicazione.",
      "**Rimozione Modale Novità al Login:** Rimosso il modale che appariva automaticamente al login. Ora le novità sono accessibili in qualsiasi momento tramite il numero di versione.",
    ],
    bugFixes: [
      "Risolto il problema della persistenza del modale delle novità che continuava ad apparire anche dopo aver cliccato 'Ho Capito!'.",
    ],
  },
  {
    version: "1.1.13",
    date: "2024-08-02",
    title: "Correzione Persistenza Visualizzazione Modale Novità",
    features: [
      "**Modale Novità Visualizzato una sola volta per versione:** Risolto il problema per cui il modale delle novità continuava a apparire anche dopo che l'utente aveva cliccato 'Ho Capito!'. Ora il modale viene mostrato solo una volta per ogni nuova versione.",
    ],
    bugFixes: [
      "Rimossa la rimozione automatica di 'lastSeenAppVersion' dall'hook useAuth per preservare lo stato di visualizzazione del modale.",
      "Corretta la logica di persistenza per assicurare che il modale non venga più mostrato agli utenti che l'hanno già visto e chiuso.",
    ],
  },
  // ... altre versioni
];