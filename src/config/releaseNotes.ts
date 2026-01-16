export const currentAppVersion = "1.1.5"; // Incrementa questa versione per ogni nuovo rilascio

export const releaseNotes = [
  {
    version: "1.1.5",
    date: "2024-08-02",
    title: "Visualizzazione Modale Novità per Tutti gli Utenti",
    features: [
      "**Modale Novità per Tutti:** Ora il modale delle novità viene mostrato a tutti gli utenti (sia 'amministratore' che 'stampa') al login quando c'è una nuova versione disponibile.",
    ],
    bugFixes: [
      "Corretta la logica di visualizzazione del modale delle novità per assicurare che venga mostrato a tutti gli utenti dopo il login.",
    ],
  },
  {
    version: "1.1.4",
    date: "2024-08-02",
    title: "Correzione Visualizzazione Modale Novità - Parte 2",
    features: [
      "**Modale Novità:** Risolto il problema per cui il modale delle novità non veniva mostrato correttamente dopo il login. Ora il modale viene visualizzato correttamente per tutti gli utenti al primo accesso o quando viene rilasciata una nuova versione.",
    ],
    bugFixes: [
      "Corretta la logica di visualizzazione del modale delle novità nella dashboard principale e per gli utenti di tipo 'stampa'.",
      "Migliorata la gestione dello stato del modale per evitare che venga mostrato più volte.",
    ],
  },
  {
    version: "1.1.3",
    date: "2024-08-02",
    title: "Correzione Visualizzazione Modale Novità",
    features: [
      "**Modale Novità:** Risolto il problema per cui il modale delle novità non veniva mostrato correttamente dopo il login.",
    ],
    bugFixes: [
      "Corretta la logica di visualizzazione del modale delle novità nella dashboard principale.",
    ],
  },
  {
    version: "1.1.2",
    date: "2024-08-02",
    title: "Nuovo Messaggio di Prova!",
    features: [
      "**Test di Visualizzazione:** Questo è un nuovo messaggio per assicurare che il modale appaia correttamente.",
    ],
    bugFixes: [],
  },
  {
    version: "1.1.1",
    date: "2024-08-02",
    title: "Messaggio di Prova - Nuove Funzionalità!",
    features: [
      "**Funzionalità di Test 1:** Questo è un messaggio di prova per la nuova funzionalità.",
      "**Funzionalità di Test 2:** Un'altra funzionalità di prova per verificare il modale.",
    ],
    bugFixes: [
      "Risolto un bug di prova che causava un errore immaginario.",
    ],
  },
  {
    version: "1.1.0",
    date: "2024-08-01",
    title: "Miglioramenti Magazzino Cartoni e Fustelle",
    features: [
      "**Ricerca Grammatura Flessibile:** La ricerca di cartoni simili ora supporta sia '235' che '235 g/m²' per la grammatura, migliorando la flessibilità di ricerca.",
      "**Conferma Cambio Cartone:** Introdotto un modale di conferma quando si seleziona un cartone simile per lo scarico, per evitare cambi accidentali.",
      "**Generazione Codici Fustelle/Pulitori:** Migliorata la generazione automatica dei codici FST-XXX e PUL-XXX per riempire le lacune, garantendo codici sequenziali e unici.",
      "**Dettagli Pulitore in Ordini d'Acquisto:** Aggiunta la visualizzazione del prezzo del pulitore e migliorata la descrizione per i pulitori autonomi negli ordini d'acquisto, per una maggiore chiarezza.",
      "**Esportazione PDF Ordini d'Acquisto:** Il PDF degli ordini d'acquisto ora include il prezzo del pulitore e gestisce correttamente gli articoli annullati, fornendo documenti più accurati.",
      "**Gestione Banche Fornitori:** Aggiunto il campo 'Banca' per i fornitori e la possibilità di selezionare tra le banche aziendali nel form di modifica/creazione fornitore, semplificando la gestione finanziaria.",
    ],
    bugFixes: [
      "Risolto un problema per cui il codice CTN non si aggiornava correttamente dopo aver selezionato un cartone simile.",
    ],
  },
  {
    version: "1.0.0",
    date: "2024-07-25",
    title: "Lancio Iniziale del Gestionale AGLombardi",
    features: [
      "Gestione Magazzino Cartoni (Giacenza, Ordini, Esauriti, Carico, Storico)",
      "Gestione Anagrafiche Clienti e Fornitori",
      "Gestione Ordini d'Acquisto con articoli multipli e stati",
      "Gestione Magazzino Fustelle (Giacenza, Carico)",
      "Gestione Magazzino Polimeri (Giacenza, Carico)",
      "Autenticazione Utenti con ruoli 'Amministratore' e 'Stampa'",
      "Esportazione dati in XLS e PDF",
      "Interfaccia utente reattiva con Shadcn/UI e Tailwind CSS",
    ],
    bugFixes: [],
  },
];