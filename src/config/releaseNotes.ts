export const currentAppVersion = "1.1.11"; // Incrementa questa versione per ogni nuovo rilascio

export const releaseNotes = [
  {
    version: "1.1.11",
    date: "2024-08-02",
    title: "Correzione Visualizzazione Immediata Modale Novità",
    features: [
      "**Modale Novità Visualizzato Immediatamente:** Risolto il problema per cui il modale delle novità non veniva mostrato immediatamente dopo il login. Ora il modale viene visualizzato subito dopo l'accesso dell'utente.",
    ],
    bugFixes: [
      "Corretta la logica di visualizzazione del modale delle novità per assicurare che venga mostrato immediatamente dopo il login, senza dover ricaricare la pagina.",
      "Migliorata la gestione dello stato del modale per garantire una visualizzazione immediata dopo l'autenticazione.",
    ],
  },
  // ... altre versioni
];