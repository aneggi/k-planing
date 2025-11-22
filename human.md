
PART TO ADD:


MACROSATATI:

1. PLANNING -> All modify is possibile
1. WAITING -> Waiting for something,
2. WORKING -> 
4. ARCHIVED -> Not possible any changes 


2. ATTESA -> Is stuked for any reason and now working on it (this is not waterfall)
3. PREPARAZIONE ->
4. PRODUZIONE
5. CHIUSURA
6. ARCHIVIATA





3. **Quotation**: qutation for a potential customer: { customerName: String, note: String, estimateHours: Number, desideratedDate: Date, status: String  }






### 4 FROM THIS POINT STOP TO READ - IS ONLY FOR HUMAN NOT FOR AI

1. Criticità Attuali

Il sistema attuale presenta diverse limitazioni:
- Scarsa comprensibilità e gestione frammentata per anni
- Mancanza di tracciabilità dei "post-lavori" (completamenti e sistemazioni)
- Difficoltà nel gestire lavori urgenti non pianificati
- Rischio di dimenticare lavori sospesi o da completare
- Assenza di collegamento diretto tra preventivo e programmazione a lungo termine
- Sbilanciamento tra capacità di progettazione e produzione


### 3.1 Obiettivi Primari

Il software deve consentire di:

1. **Monitorare la capacità produttiva** dell'azienda in tempo reale (capire se una determinata commessa verrà elaborata in quella settimana o in un altra)
2. **Pianificare le attività** assegnando il personale alle diverse fasi delle commesse (indicando persona e cliente/commessa da svolgere, almeno a mezze giornate, ma anche a ore se necessario)
3. **Gestire le assenze** (ferie, malattie, altre mancanze) nel calcolo della capacità
4. **Collegare preventivo e programmazione** per avere visibilità dall'offerta alla consegna

### 3.2 Obiettivi Operativi

Il sistema deve supportare:

- Programmazione su orizzonte di 2/3 mesi con dettaglio settimanale ma stima solo di massima nell'anno e mezzo successivo.
- Inizialmente alla commessa verrà solo assegnata una data ipotetica di produzione e secondo un template dell'utente vi verrà assegnato un tempo di produzione in ore suddivise per template standard, tipo 30% progettazione, 30% produzione, 40% montaggio, ci sono piu template per la creazione di una nuova commessa. 
- Distinzione tra capacità produttiva disponibile (numero persone per orario di lavoro, totale in ore) e carico pianificato (ore commessa, e una conversione fra punti e ore necessarie)
- Gestione flessibile delle commesse con possibilità di modificare ripartizioni e date 
- Tracciabilità dello stato di avanzamento per ogni commessa
- Comunicazione efficace tra ufficio tecnico, produzione e montaggio

---

## 4. Requisiti Funzionali del Software

### 4.1 Gestione Anagrafiche

#### F1.1 - Gestione Personale
- Anagrafica base dipendenti interni ed montatori esterni
- Classificazione per tipologia (progettazione/produzione/montaggio)
- Gestione disponibilità e assenze (ferie, malattia, altro)
- Capacità lavorativa espressa in mezze giornate e qualche eccezzione in ore

#### F1.2 - Gestione Template di Progetto
- Definizione di template con fasi standard
- Percentuale di carico su ogni fase (es. 70% produzione, 30% montaggio... ecc.)
- Possibilità di personalizzare template per tipologie specifiche di commesse
- Gestione di processi con fasi assenti o personalizzate

#### F1.3 - Gestione Commesse
- Codice commessa collegato alla cartella sul server aziendale
- Totale ore preventivate per la commessa
- Template di processo associato
- Date chiave (conferma, inizio previsto, fine prevista)

### 4.2 Pianificazione e Schedulazione

#### F2.1 - Pianificazione delle Commesse

Il sistema deve permettere l'inserimento del piano produttivo con:
- **Input**: ore necessarie totali + data inizio o data fine desiderata
- **Carico standard**: applicazione automatica del template (70-30% e numero persone standard)
- **Personalizzazione**: possibilità di modificare ripartizione, staccare le fasi temporalmente, cambiare numero di persone dedicate
- Assegnazione indicativa senza allocare singoli dipendenti

#### F2.2 - Gestione Capacità Produttiva

Calcolo dinamico che considera:
- Personale disponibile per fase (produzione/montaggio)
- Assenze pianificate e non pianificate
- Carico di lavoro assegnato
- Stima della capacità residua nei prossimi 3 mesi
- Evidenziazione di sovraccarichi o settimane critiche

#### F2.3 - Gestione Modifiche e Ripianificazione

Il software deve supportare:
- Spostamento di commesse o fasi tramite trascinamento
- Ricalcolo automatico dell'impatto sulle date di consegna
- Adattamento della pianificazione in caso di eventi non previsti
- Gestione di lavori urgenti che si "infilano" nella programmazione

### 4.3 Visualizzazione e Reporting

#### F3.1 - Viste Pianificazione

Il sistema deve offrire diverse modalità di visualizzazione:
- **Vista a calendario**: visione settimanale/mensile con allocazioni
- **Vista Gantt**: timeline delle commesse con dipendenze e milestone
- **Vista carico risorse**: distribuzione del personale per fase/settimana
- **Vista per dipendente**: accessibile da web/mobile per visualizzare le proprie assegnazioni

#### F3.2 - Dashboard e Indicatori

Visualizzazione di:
- Capacità produttiva disponibile vs. carico pianificato
- Commesse in corso e stato di avanzamento per fase
- Scadenze imminenti e ritardi potenziali
- Differenze tra capacità e domanda

#### F3.3 - Gestione Note e Comunicazioni

- Note specifiche su commesse o lavori particolari
- Promemoria per lavori da completare
- Richieste particolari dei clienti (es. disponibilità in settimane specifiche)
- Comunicazioni da fornitori o cantieri

### 4.4 Integrazione e Workflow

#### F4.1 - Collegamento Preventivo-Produzione

Il software deve creare un flusso continuo tra:
- Fase di preventivazione (ore stimate)
- Conferma ordine e creazione commessa
- Pianificazione produttiva automatica
- Monitoraggio avanzamento
- Chiusura commessa

#### F4.2 - Gestione Completamenti e Post-Lavori

Tracciabilità di:
- Lavori sospesi in attesa di materiali o decisioni
- Sistemazioni di cantiere da completare
- Lavori aggiuntivi non previsti inizialmente
- Garanzia che nessun intervento venga dimenticato

#### F4.3 - Notifiche e Promemoria

Sistema di alert per:
- Scadenze imminenti
- Materiali in arrivo
- Cantieri pronti per il montaggio
- Richieste particolari dei clienti

---

## 5. Requisiti Non Funzionali

### 5.1 Usabilità

- Interfaccia intuitiva accessibile da personale con competenze informatiche base
- Operatività da desktop per pianificazione e da mobile/web per consultazione
- Tempo di apprendimento limitato grazie a logiche simili a strumenti già conosciuti (planner settimanale)

### 5.2 Prestazioni

- Calcolo in tempo reale della capacità produttiva anche con 50+ commesse attive
- Ricalcolo immediato delle date in caso di modifiche alla pianificazione
- Accesso concorrente da parte di 5-10 utenti

### 5.3 Gestione Permessi

Differenziazione degli accessi:
- **Pianificatori**: accesso completo per modifiche alla programmazione
- **Personale operativo**: accesso in sola lettura per visualizzare le proprie assegnazioni
- **Amministrazione**: configurazione template e anagrafiche

---

## 6. Modello dei Dati Principale

### 6.1 Entità Chiave

1. **Persona**: anagrafica, tipo (interno/esterno), ruolo (produzione/montaggio), calendario assenze
2. **Template Progetto**: nome, fasi incluse, percentuale carico per fase, numero persone standard
3. **Calendario**: giorni lavorativi, festività, chiusure aziendali
4. **Progetto/Commessa**: codice, cliente, ore totali, template applicato, date chiave, stato
5. **Assegnazione**: collegamento persona-commessa-fase con ore allocate e periodo

### 6.2 Stati Commessa

Le commesse possono trovarsi in diversi stati corrispondenti alle macrofasi:
- In attesa di rilievi
- In progettazione
- In esecutivi
- In IMOS
- In produzione
- In montaggio
- In completamento
- Chiusa


