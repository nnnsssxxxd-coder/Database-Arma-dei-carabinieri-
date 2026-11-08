import { readFile, writeFile } from 'node:fs/promises';

const gradlePath = new URL('../android/app/build.gradle', import.meta.url);
let gradle = await readFile(gradlePath, 'utf8');
if (!gradle.includes('signingConfigs {')) {
  gradle = gradle.replace(/android\s*\{/, `android {
    signingConfigs {
        release {
            storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
    }
`);
}
if (!/signingConfig\s+signingConfigs\.release/.test(gradle)) {
  gradle = gradle.replace(/(buildTypes\s*\{\s*release\s*\{)/, '$1\n            signingConfig signingConfigs.release');
}
if (!gradle.includes('signingConfig signingConfigs.release')) {
  throw new Error('Impossibile configurare la firma release: struttura Gradle inattesa.');
}
await writeFile(gradlePath, gradle);
console.log('Firma release configurata senza scrivere credenziali nel repository.');
