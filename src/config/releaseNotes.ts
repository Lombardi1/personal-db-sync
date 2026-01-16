export const currentAppVersion = "1.1.9"; // Incrementa questa versione per ogni nuovo rilascio

export const releaseNotes = [
  {
    version: "1.1.9",
    date: "2024-08-02",
    title: "Correzione Finale Visualizzazione Modale Novità",
    features: [
      "**Modale Novità Corretto:** Risolto definitivamente il problema per cui il modale delle novità non veniva mostrato correttamente dopo il login. Ora il modale viene visualizzato correttamente per tutti gli utenti al primo accesso o quando viene rilasciata una nuova versione.",
    ],
    bugFixes: [
      "Corretta la logica di visualizzazione del modale delle novità per assicurare che venga mostrato a tutti gli utenti dopo il login, indipendentemente dal ruolo.",
      "Migliorata la gestione dello stato del modale per evitare che venga mostrato più volte o in modo errato.",
    ],
  },
  // ... altre versioni
];