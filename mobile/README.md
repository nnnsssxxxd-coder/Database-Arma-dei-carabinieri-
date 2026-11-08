# App mobile — Database Arma dei Carabinieri

Questa cartella contiene il progetto nativo basato su Capacitor. Il sito principale nella root del repository non viene modificato: prima di ogni build, `scripts/prepare-web.mjs` ne copia l'ultima versione in `mobile/www/index.html`.

## Android (APK installabile, senza Play Store)

La build automatica è disponibile in GitHub Actions sul branch `mobile-app`:
1. Apri **Actions** nel repository.
2. Avvia **Build app Android (APK)** con **Run workflow**, oppure attendi il completamento dopo un commit sul branch.
3. Scarica l'artifact `database-arma-carabinieri-debug-apk`.
4. Estrai `app-debug.apk` e installalo sul dispositivo Android. Potrebbe essere necessario autorizzare l'installazione da questa origine.

Il file è una build **debug** per installazione personale/test, non una release firmata per gli store.

## Build locale

Requisiti: Node.js 22+, Android Studio/Android SDK e JDK 21.

```bash
cd mobile
npm install
npm run prepare:web
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

APK: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`.

## iPhone / iOS

Il progetto include il runtime Capacitor iOS. Per generare e installare l'app servono macOS, Xcode e una firma di sviluppo Apple. Da Mac:

```bash
cd mobile
npm install
npm run prepare:web
npx cap add ios
npx cap sync ios
npx cap open ios
```

Un iPhone richiede un provisioning profile/firma valida; non è possibile installare un'app iOS arbitraria come un APK Android.

## Servizi e dati

L'app carica una copia locale del frontend e continua a collegarsi ai servizi Supabase già configurati nel progetto (Auth, database e funzioni Edge). È necessaria una connessione Internet per le funzioni che dipendono da Supabase. Non vengono create tabelle, non vengono modificati utenti, password o dati esistenti. Le chiavi privilegiate non devono mai essere inserite nell'app.

## Aggiornamenti

Le modifiche future al sito principale vengono incluse nella prossima build mobile eseguendo lo script di preparazione. L'app installata non si aggiorna da sola: occorre installare una nuova APK quando viene prodotta una nuova versione.
