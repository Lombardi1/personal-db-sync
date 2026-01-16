export const currentAppVersion = "1.1.8"; // Incrementa questa versione per ogni nuovo rilascio

export const releaseNotes = [
  {
    version: "1.1.8",
    date: "2024-08-02",
    title: "Correzione Visualizzazione Modale Novità per Utente",
    features: [
      "**Modale Novità per Utente:** Ora il modale delle novità viene mostrato a ogni utente in modo persistente, utilizzando un identificatore univoco per ogni utente. Ogni utente vedrà il modale solo una volta per versione, ma diversi utenti possono vederlo indipendentemente.",
    ],
    bugFixes: [
      "Corretta la logica di visualizzazione del modale delle novità per assicurare che venga mostrato correttamente a ogni utente in modo persistente.",
      "Rimossa la rimozione del localStorage all'accesso per mantenere le preferenze dell'utente.",
    ],
  },
  {
    version: "1.1.7",
    date: "2024-08-02",
    title: "Correzione Visualizzazione Modale Novità per Tutti gli Utenti",
    features: [
      "**Modale Novità per Tutti:** Ora il modale delle novità viene mostrato a ogni utente al login quando c'è una nuova versione disponibile, indipendentemente dal fatto che l'abbiano già visto in precedenza.",
    ],
    bugFixes: [
      "Corretta la logica di visualizzazione del modale delle novità per assicurare che venga mostrato a tutti gli utenti dopo il login.",
      "Rimossa la persistenza del flag 'ultima versione vista' per forzare la visualizzazione del modale a ogni accesso quando c'è una nuova versione.",
    ],
  },
  {
    version: "1.1.6",
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