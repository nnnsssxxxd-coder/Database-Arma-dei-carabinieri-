# Simulatore Operativo 3D — Unity Android

Espansione separata del progetto Database Arma dei Carabinieri. Il client Unity legge lo stesso profilo e la stessa progressione Supabase dell'app originale.

## Stato del progetto
Questa è la base sorgente Unity (MVP tecnico), non un APK già compilato. Per produrre l'APK serve Unity Editor con Android Build Support installato.

## Versione consigliata
Unity 2022.3 LTS o Unity 6 LTS, template 3D Core.

## Avvio
1. Aprire questa cartella come progetto Unity.
2. In Project Settings > Player impostare Android, package id `it.simulatoreoperativo.game`.
3. Creare un oggetto vuoto con `GameBootstrap`.
4. Inserire URL e publishable key Supabase in `SupabaseConfig` (sono valori pubblici, mai usare service-role).
5. Avviare in Play Mode.

## Accesso e progressione
Il login username/password chiama la Edge Function `username-login` già usata dall'app originale. Il gioco legge `profiles` e `progress.payload` con il token dell'utente. Non crea profili duplicati e non scrive EXP dal client. Le ricompense missione resteranno disabilitate finché non sarà disponibile un endpoint server-side dedicato e idempotente per il gioco: così il client non può falsificare EXP.

## Contenuti MVP
- Ambiente 3D procedurale: cortile, caserma, blocco uffici e autorimessa.
- Personaggio in terza persona e controlli tastiera; joystick touch previsto come passaggio successivo.
- Pannello login, profilo, grado, reparto ed EXP.
- Missioni dimostrative non letali, senza ricompense non ancora autorizzate dal server.

Il progetto non è un prodotto ufficiale dell'Arma dei Carabinieri.
