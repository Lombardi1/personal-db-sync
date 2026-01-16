export const currentAppVersion = "1.1.0"; // Incrementa questa versione per ogni nuovo rilascio

export const releaseNotes = [
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