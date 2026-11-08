# App mobile — Database Arma dei Carabinieri

Progetto Android nativo basato su Capacitor 8.6.0. Il sito principale non viene modificato: la build include una copia locale aggiornata di `index.html` e usa il backend Supabase già configurato dal sito.

## APK Android

La build automatica si trova nel branch `mobile-app` e viene eseguita da GitHub Actions:
- `database-arma-carabinieri-debug-apk`: build di test installabile.
- `database-arma-carabinieri-release-apk`: release firmata con la chiave privata personale, disponibile dopo aver configurato i segreti descritti sotto.

Apri la scheda Actions del repository e scarica l'artifact della compilazione più recente. Estrai lo ZIP e installa l'APK sul dispositivo Android.

## Attivare la firma release (una sola volta)

Android richiede che ogni APK sia firmato. Per mantenere gli aggiornamenti installabili sopra la versione precedente, bisogna usare sempre la stessa chiave privata. Non caricare mai il keystore nel repository.

1. Genera un keystore personale sul tuo computer con Android Studio (Build > Generate Signed Bundle / APK > Create new) oppure con `keytool`.
2. Converti il file keystore in Base64:
   - Linux/macOS: `base64 -w 0 release-key.jks`
   - macOS (alternativa): `base64 < release-key.jks | tr -d '\\n'`
3. Nel repository GitHub apri Settings > Secrets and variables > Actions > New repository secret e crea questi quattro segreti:
   - `ANDROID_KEYSTORE_BASE64`: contenuto Base64 del keystore.
   - `ANDROID_KEYSTORE_PASSWORD`: password del keystore.
   - `ANDROID_KEY_ALIAS`: alias della chiave.
   - `ANDROID_KEY_PASSWORD`: password della chiave.
4. Conserva una copia sicura del keystore e delle password. Se perdi la chiave, non potrai firmare aggiornamenti compatibili con quella installazione.

Dopo aver configurato i segreti, avvia nuovamente il workflow: verrà generata anche la release firmata. Senza questi segreti, il workflow produce soltanto la build debug e non finge di produrre una release personale firmata.

## Servizi e dati

L'app include il frontend locale e mantiene il collegamento al progetto Supabase già presente nel sito (autenticazione e database). Le funzioni che dipendono da Supabase richiedono Internet. Non vengono create o modificate tabelle, account, password o dati. Le chiavi privilegiate non devono mai essere incluse nell'app.

## Verifiche e limiti

La compilazione automatica verifica che il progetto Android si generi e che l'APK venga prodotto. La verifica finale di login, GPS, fotocamera e comportamento su dispositivi reali richiede test sul telefono: la compilazione da sola non può garantirli. La versione installata non si aggiorna da sola; per aggiornare, scarica e installa una nuova release firmata con la stessa chiave.

## Build locale

Requisiti: Node.js 22+, Android Studio con Android SDK e JDK 21.

```bash
cd mobile
npm install
npm run prepare:web
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```
