# Stato lavori — sito Database Forze dell’Ordine

**Ultimo audit:** 28 novembre 2026  
**Ramo:** `feat/expansione-sei-corpi`  
**PR:** [#4 — Espansione sito a sei ambienti istituzionali](https://github.com/nnnsssxxxd/Database-Arma-dei-carabinieri-/pull/4)  
**Ultimo commit di codice verificato:** `90ca4a38be060ccfbae15787b47a9c3abc87bf27`

## Stato della pubblicazione

La PR è ancora in bozza, non è stata unita e la versione a sei ambienti non è pubblicata su GitHub Pages. Le migrazioni non sono state applicate a Supabase e le Edge Functions non sono state distribuite. Nessun account o progresso personale è stato modificato.

## Modifiche di questo avanzamento

- Aggiunta la migrazione `20261127140000_enforce_source_verified_quiz_content.sql`: introduce `source_url` e `source_note` per ogni quesito generale e di reparto, con vincoli di coerenza.
- Le funzioni server-side di quiz generale, esame di avanzamento e quiz di reparto rifiutano quesiti privi di fonte HTTPS, nota specifica, quattro opzioni distinte o spiegazione sufficiente.
- La correzione server-side restituisce una revisione con risposta corretta, spiegazione e fonte; l'interfaccia mostra i collegamenti alla fonte.
- Gli scenari di missione/servizio non vengono più presentati come completabili se le singole domande non hanno fonte e nota verificabile. Le 24 schede restano visibili come **IN REVISIONE** finché le 72 domande non saranno documentate.
- Aggiunti controlli automatici per impedire regressioni sulla tracciabilità delle fonti.

## Verifiche automatiche

Sul commit `90ca4a38be060ccfbae15787b47a9c3abc87bf27`:

- **App quality gate:** SUCCESS — run [550](https://github.com/nnnsssxxxd-coder/Database-Arma-dei-carabinieri-/actions/runs/46126414408).
- **Validate six-corps website:** SUCCESS — run [150](https://github.com/nnnsssxxxd-coder/Database-Arma-dei-carabinieri-/actions/runs/46126414402).
- Type-check delle Edge Functions, parsing JavaScript, riferimenti DOM, isolamento dei Corpi, controlli missione e test di tracciabilità superati.

Questi sono controlli statici e di regressione: non equivalgono a un test end-to-end autenticato su un ambiente Supabase di staging.

## Audit dei contenuti su Supabase (sola lettura)

| Area | Stato verificato |
|---|---|
| Quiz generale | 100 Carabinieri + 100 Finanza. Carabinieri: 30 prompt-template e 60 spiegazioni generiche; Finanza supera i controlli strutturali. |
| Quiz di reparto | 4 banche Carabinieri + 11 Finanza, 100 quesiti ciascuna; struttura valida e distribuzione 33/33/34. |
| Quiz veicolo | 4 percorsi per Carabinieri + 4 per Finanza, 100 quesiti ciascuno; struttura 30 fisica / 40 tecnica / 30 normativa. Le banche contengono rispettivamente 86 e 94 URL distinti; la qualità sostanziale delle fonti deve ancora essere verificata. |
| Cataloghi reparti | In produzione risultano 4 reparti Carabinieri e 11 Finanza; le migrazioni di ramo completano gli 11 per tutti e sei i Corpi. |
| Cataloghi veicoli | In produzione risultano 4 mezzi Carabinieri e 4 Finanza; il ramo aggiunge i 16 percorsi degli altri quattro Corpi. |
| Missioni | 24 scenari e 72 domande statiche; nessuna domanda ha ancora fonte e nota specifica. Sono quindi bloccate dal controllo fail-closed. |

### Contenuti ancora mancanti

- 400 quesiti generali per Polizia, Esercito, Marina e Aeronautica.
- 51 banche di reparto da 100 quesiti: 5.100 quesiti.
- 16 banche veicolo da 100 quesiti: 1.600 quesiti.
- **Totale: 7.100 quesiti mancanti**, senza contare la bonifica dei contenuti esistenti.
- Fonte e nota specifica da associare a 1.700 quesiti già presenti (200 generali e 1.500 di reparto).
- Bonifica dei 30 prompt-template e delle 60 spiegazioni generiche del quiz generale Carabinieri.
- Fonti istituzionali/normative per tutte le 72 domande di missione.

I dati non verificati non vengono completati con segnaposto o risposte inventate. I controlli server-side impediscono di usare le banche incomplete.

## Sicurezza e passaggi amministrativi

- RLS risulta attiva su tutte le 30 tabelle pubbliche esaminate; le policy lette non concedono accesso client diretto alle tabelle operative. La nuova migrazione non modifica le policy.
- Supabase Security Advisor segnala disattivata la protezione delle password compromesse.
- La documentazione Supabase indica che la protezione è disponibile dal piano Pro in su. Non è disponibile un'azione del connettore per cambiare questa impostazione: l'amministratore deve aprire **Supabase Dashboard → Authentication → Password security** e attivare **Prevent the use of leaked passwords**. Se il progetto è sul piano Free, occorre prima passare a Pro o superiore. [Documentazione Supabase](https://supabase.com/docs/guides/auth/password-security).
- Non applicare le migrazioni o distribuire le Edge Functions finché non è disponibile un ambiente di test per verificare schema, RPC, RLS e flussi end-to-end.

## Prossime attività

1. Completare e verificare le 7.100 domande mancanti con fonti puntuali; bonificare le banche esistenti.
2. Associare fonte e nota a tutti i 1.700 quesiti generali/di reparto già presenti e alle 72 domande di missione.
3. Verificare qualitativamente i riferimenti dei quiz veicolo e i cataloghi istituzionali.
4. Eseguire migrazioni e test RPC su staging, poi verificare login, separazione dei Corpi, salvataggi, progressione, missioni e interfaccia mobile/desktop.
5. Abilitare la protezione password compromesse tramite l'amministratore.
6. Solo dopo il superamento di tutti i controlli: applicare le migrazioni di produzione, distribuire le Edge Functions, unire la PR, attendere GitHub Pages e verificare il sito pubblico su mobile e desktop.
