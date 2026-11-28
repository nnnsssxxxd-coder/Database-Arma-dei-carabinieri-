# Stato lavori — sito Database Forze dell’Ordine

**Audit:** 28 novembre 2026  
**Ramo:** `feat/expansione-sei-corpi`  
**PR:** [#4 — Espansione sito a sei ambienti istituzionali](https://github.com/nnnsssxxxd-coder/Database-Arma-dei-carabinieri-/pull/4)  
**Ultimo commit applicativo verificato:** `55c8fa2e8c67e329f4ba30df0a97c5b9dae3850a`

## Stato della pubblicazione

La PR è ancora **DRAFT**, non è stata unita e la versione a sei ambienti non è pubblicata su GitHub Pages. Le migrazioni del ramo non sono state applicate a produzione e le Edge Functions non sono state distribuite. Nessun account o progresso personale è stato modificato.

## Modifiche verificate in questo avanzamento

- Le domande delle missioni non ricevono più una quarta opzione artificiale: il server restituisce esclusivamente le opzioni effettivamente redatte.
- La validazione missioni è stata estratta in `supabase/functions/game-engine/mission-validation.ts`; sono richieste esattamente quattro opzioni esplicite e distinte, un indice corretto valido, una spiegazione sufficiente e una fonte HTTPS con nota specifica.
- Aggiunti test Deno per domande complete, tre opzioni, duplicati, indice fuori intervallo, fonte assente/non HTTPS/nota insufficiente e spiegazioni brevi.
- Il controllo qualità esegue ora i test Deno e impedisce la reintroduzione di opzioni inventate.
- Le 24 schede missione restano **IN REVISIONE**: le 72 domande attuali non hanno ancora fonti e note individuali e presentano tre opzioni, quindi il server le blocca correttamente.

## Verifiche automatiche

Sul commit `55c8fa2e8c67e329f4ba30df0a97c5b9dae3850a`:

- [App quality gate — SUCCESS, run 560](https://github.com/nnnsssxxxd-coder/Database-Arma-dei-carabinieri-/actions/runs/46127663219).
  - Type-check di tutte le Edge Functions: SUCCESS.
  - Test Deno della validazione missioni: SUCCESS.
  - Tutti i controlli statici e di regressione, compresa la tracciabilità delle fonti: SUCCESS.
- [Validate six-corps website — SUCCESS, run 167](https://github.com/nnnsssxxxd-coder/Database-Arma-dei-carabinieri-/actions/runs/46127663270).

Il precedente run 559 aveva segnalato un'asserzione del workflow che cercava la validazione nel vecchio file dopo l'estrazione del modulo. Il controllo è stato aggiornato e il run 560 è passato integralmente.

Questi workflow sono controlli statici e unitari; **non** equivalgono a test end-to-end autenticati su Supabase staging.

## Audit Supabase di produzione — sola lettura

### Banche dati

- **Quiz generali:** 100 domande attive per Carabinieri e 100 per Guardia di Finanza. La banca Carabinieri presenta 30 prompt-template e 60 spiegazioni generiche: non è pubblicabile. La banca Finanza è strutturalmente valida, ma manca ancora la tracciabilità puntuale delle fonti.
- **Quiz di reparto:** 4 banche Carabinieri e 11 Finanza, tutte da 100 domande e strutturalmente valide (opzioni/indici/spiegazioni e prompt distinti). Le colonne `source_url` e `source_note` non esistono ancora in produzione per queste tabelle: saranno aggiunte dalla migrazione del ramo e dovranno poi essere valorizzate.
- **Quiz veicolo:** 4 percorsi Carabinieri e 4 Finanza, ciascuno con 100 domande e rapporto 30 fisica / 40 tecnica / 30 normativa. Ogni banca ha 17–18 URL distinti; il numero di URL non dimostra che ogni riferimento sostenga la domanda specifica. La revisione qualitativa di ogni quesito e fonte resta obbligatoria.
- L'audit delle note ha individuato 8 quesiti di fisica Carabinieri con note troppo brevi ("Legge d’inerzia" / "Forza centripeta"). La migrazione di ramo `20261127150000_refine_carabinieri_vehicle_physics_sources.sql` le sostituisce con riferimenti NASA Glenn e University of Central Florida; entrambi i contenuti sono stati verificati. Restano da verificare le altre associazioni domanda-fonte: alcune URL sono riutilizzate su molti quesiti (ad esempio Normattiva e IMO), quindi il solo conteggio delle URL non prova la pertinenza puntuale.
- **Catalogo reparti in produzione:** 4 Carabinieri e 11 Finanza.
- **Catalogo veicoli in produzione:** 4 Carabinieri e 4 Finanza.
- Le migrazioni del ramo preparano i cataloghi degli altri quattro Corpi e completano a 11 i reparti Carabinieri; non sono ancora applicate.

### Contenuti ancora mancanti o da bonificare

- 400 quesiti generali per Polizia, Esercito, Marina e Aeronautica.
- 51 banche di reparto da 100 quesiti: 5.100 quesiti.
- 16 banche veicolo da 100 quesiti: 1.600 quesiti.
- **Totale: 7.100 quesiti da redigere e verificare**, senza segnaposto o duplicati.
- Associare fonte e nota specifica ai 200 quesiti generali e ai 1.500 quesiti di reparto già presenti.
- Bonificare i 30 prompt-template e le 60 spiegazioni generiche del quiz generale Carabinieri.
- Documentare con fonti puntuali e quattro opzioni specifiche le 72 domande dei 24 scenari di missione.
- Verificare che ogni fonte dei quiz veicolo sia istituzionale/normativa o accademica autorevole e supporti proprio il contenuto della domanda.

I controlli server-side restano fail-closed: le banche incomplete o non documentate non devono essere somministrate né assegnare EXP.

## Sicurezza e compatibilità

- RLS è attiva su tutte le 30 tabelle pubbliche esaminate; le policy lette non concedono accesso client diretto alle tabelle operative. La verifica va ripetuta sul database di staging dopo le migrazioni.
- Il Security Advisor segnala disattivata la protezione delle password compromesse. Supabase documenta che la funzione è disponibile dal piano Pro in su. L'amministratore deve verificare il piano e, se supportato, aprire **Supabase Dashboard → Authentication → Password security** e attivare **Prevent the use of leaked passwords**. [Documentazione ufficiale Supabase](https://supabase.com/docs/guides/auth/password-security).
- I log Edge interrogati non mostrano richieste con risposta HTTP 4xx/5xx nel campione restituito; questo non sostituisce test autenticati.
- Non sono stati distribuiti aggiornamenti alle Edge Functions e non è stata applicata alcuna migrazione di produzione.

## Blocco per i test end-to-end su staging

Non esiste un branch Supabase di staging. La creazione del branch di test è stata fermata perché Supabase richiede una conferma esplicita del costo: **0,01344 USD/ora** di compute. Nessun branch è stato creato e nessun costo è stato avviato. Serve l'approvazione dell'amministratore prima di creare `pr4-staging-20261128`, applicare le migrazioni del ramo e provare RPC, RLS e flussi autenticati su un ambiente separato.

## Prossime attività

1. Ottenere l'approvazione del costo per il branch Supabase staging e creare l'ambiente isolato.
2. Applicare le migrazioni del ramo soltanto su staging; verificare vincoli, cataloghi, RPC, RLS e compatibilità senza toccare account o progressi di produzione.
3. Eseguire test E2E autenticati per i sei Corpi: login separato, autorizzazioni, salvataggi, EXP, esami, reparti, missioni/servizi e interfaccia mobile/desktop.
4. Completare e verificare le 7.100 domande mancanti e bonificare le banche esistenti con fonti puntuali.
5. Ottenere l'intervento dell'amministratore per la protezione password compromesse, se il piano lo consente.
6. Solo dopo il superamento di tutti i criteri: migrare produzione, distribuire le Edge Functions, unire la PR, attendere GitHub Pages e verificare il sito pubblico su mobile e desktop.

La PR rimane in bozza. Non verrà unita o pubblicata con banche quiz incomplete, fonti non verificate, test E2E mancanti o vulnerabilità note.
