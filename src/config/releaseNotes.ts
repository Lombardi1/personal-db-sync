export const currentAppVersion = "1.1.13"; // Incrementa questa versione per ogni nuovo rilascio

export const releaseNotes = [
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
  {
    version: "1.1.12",
    date: "2024-08-02",
    title: "Correzione Visualizzazione Immediata Modale Novità al Login",
    features: [
      "**Modale Novità Visualizzato Immediatamente al Login:** Risolto il problema per cui il modale delle novità non veniva mostrato immediatamente dopo il login. Ora il modale viene visualizzato subito dopo l'accesso dell'utente, senza dover ricaricare la pagina.",
    ],
    bugFixes: [
      "Spostata la gestione del modale delle novità direttamente nel componente di login per garantire la visualizzazione immediata dopo l'autenticazione.",
      "Corretta la logica di reindirizzamento per mostrare il modale prima di accedere alla dashboard.",
    ],
  },
  // ... altre versioni
];