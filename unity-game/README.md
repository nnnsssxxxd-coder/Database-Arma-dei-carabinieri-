# Simulatore Operativo 3D — Unity Android

Client di gioco separato dall'app Database Arma dei Carabinieri. Le due app condividono lo stesso account e i dati di carriera tramite Supabase; non vengono creati profili duplicati.

## Protezione dei dati
- Il gioco legge lo stato tramite la Edge Function `game-engine`, non accede direttamente alle tabelle protette.
- La funzione verifica il JWT e lo stato attivo del profilo.
- Il client non aggiorna mai direttamente EXP, gradi o reparto.
- Le missioni sono validate lato server e registrate in `game_mission_completions`, con vincolo univoco utente/missione per impedire ricompense duplicate.
- I dati di gioco sono separati dai dati personali e di carriera dell'app.
- Non sono state modificate le tabelle principali per collegare il client Unity.

## Contenuti attuali
- Scena iniziale inclusa in Build Settings.
- Caserma e piazzale procedurali, personaggio terza persona e camera.
- Login username/password tramite la funzione `username-login` esistente.
- Sincronizzazione profilo, grado, EXP e reparto tramite `game-engine`.
- Quattro missioni demo con ricompense server-side una tantum.
- Controlli touch direzionali e supporto tastiera quando il vecchio Input Manager è attivo.

## Apertura e build
1. Aprire `unity-game` con Unity 2022.3.62f1.
2. Installare Android Build Support, SDK/NDK e OpenJDK tramite Unity Hub.
3. Verificare che Android sia la piattaforma attiva e il package id sia `it.simulatoreoperativo.game`.
4. Aprire la scena `Assets/Scenes/Boot.unity` e premere Play.
5. Per APK: File > Build Settings > Android > Build.

La cartella contiene il progetto sorgente, non un APK già compilato. In questo ambiente non è stato possibile eseguire Unity Editor, compilare C# o testare su dispositivo Android: la build finale va quindi verificata in Unity prima della distribuzione.

## Nota
Progetto indipendente e non ufficiale dell'Arma dei Carabinieri.
