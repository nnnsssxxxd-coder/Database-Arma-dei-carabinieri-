# Simulatore Carabinieri 3D — GDevelop

## Direzione
Gioco mobile 3D in stile realistico, pensato prima di tutto per Android e gestibile dall'editor visuale di GDevelop.

## Regole di sicurezza del progetto
- Sviluppo isolato nel branch `gdevelop-simulatore-3d-realistico`.
- Il branch `main` e il sito/app esistenti non vengono modificati.
- Nessuna modifica allo schema Supabase o ai salvataggi esistenti senza revisione e approvazione.
- Il gioco deve poter funzionare in modalità demo anche senza connessione al database.

## Prima versione giocabile (vertical slice)
1. Una piccola area urbana 3D con strada, marciapiedi, edifici e illuminazione.
2. Una caserma esplorabile con ingresso, reception e garage.
3. Un personaggio in terza persona con controlli touch: joystick virtuale e pulsante interazione.
4. Una vettura di servizio parcheggiata nel garage; guida da aggiungere dopo aver verificato movimento e collisioni.
5. HUD mobile semplice: nome profilo, grado demo, obiettivo attivo e pulsante menu.
6. Una missione tutorial: entra in caserma, raggiungi la sala operativa e avvia un pattugliamento simulato.

## Stile visivo
- Realistico ma ottimizzato per telefoni Android di fascia media.
- Materiali PBR leggeri, luci e ombre contenute, texture compresse.
- Palette istituzionale sobria: blu scuro, nero, bianco e dettagli rossi.
- Modelli originali o con licenze compatibili; niente asset commerciali copiati.

## Struttura prevista
- Scene: Menu, Caserma, AreaUrbana, MissioneTutorial.
- Eventi: MovimentoGiocatore, Interazioni, Missioni, HUD, SalvataggioLocale, Sincronizzazione.
- Oggetti riutilizzabili: Personaggio, Edificio, Veicolo, PuntoInterazione, NPC.
- Controlli: joystick touch a sinistra, visuale/rotazione a destra, interazione contestuale.

## Collegamento al simulatore esistente
La sincronizzazione Supabase sarà aggiunta solo dopo la prima demo locale. Prima si verificheranno le tabelle e le policy già presenti. La prima integrazione sarà di sola lettura per profilo, grado ed esperienza; ogni scrittura dovrà essere esplicita, validata e non dovrà mai sovrascrivere progressi esistenti.

## Criteri di completamento della prima demo
- Si apre su Android senza errori.
- Il giocatore si muove con controlli touch.
- Si può entrare nella caserma e raggiungere la sala operativa.
- HUD leggibile su schermi piccoli.
- Nessuna chiamata a Supabase necessaria per avviare il gioco.
- Prestazioni verificate su dispositivo reale prima di dichiarare pronta la build.
