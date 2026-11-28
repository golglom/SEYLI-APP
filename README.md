# SEYLI — version Expo / React Native

Portage Expo (SDK 58, React Native 0.88) de l'application Android native SEYLI, pensé pour être testé
directement dans **Expo Go** sur Android et iOS.

Le projet Android d'origine (Kotlin/Compose) n'a pas été modifié. Tout le portage vit dans ce dossier.

## Démarrage rapide

Prérequis : Node.js 22.13+ et l'application **Expo Go SDK 58** sur ton téléphone.

```bash
cd seyli-expo
npm install
npx expo install --fix     # aligne les modules natifs sur la version d'Expo Go
npx expo start
```

Scanne le QR code avec Expo Go (Android) ou l'appareil photo (iOS).

### Clé Gemini (par utilisateur)

Chaque personne connecte sa propre clé dans l'app : **Réglages → Clé API IA** (création gratuite sur Google AI Studio). La clé est stockée uniquement sur le téléphone, testée avant enregistrement, et peut être supprimée à tout moment. Aucune clé n'est embarquée dans l'APK.

Sans clé, l'app fonctionne en mode 100 % local : moteur SMS embarqué, coach de secours, données locales. Si une clé est refusée ou si le réseau manque, l'analyse repasse automatiquement en local.

Seul le modèle peut être changé au build via `EXPO_PUBLIC_GEMINI_MODEL` (défaut : `gemini-2.5-flash`) dans `.env`.

## Fonctionnalités portées

| Écran | Contenu |
| --- | --- |
| Accueil | Carte « bouclier » dégradée, stats, SOS 3018 1 clic, Allô 1011, alarme panique, check-in d'humeur, actions rapides |
| Analyser | Texte + capture/photo, analyse Gemini ou moteur local, score de risque, recommandations, réponses à copier, archivage |
| Preuves | Coffre avec verrou biométrique/code, recherche, filtres, ajout manuel, statuts, notes, export/partage, suppression |
| Coach | Chat IA (3 modes) avec secours hors-ligne, numéros d'urgence, structures d'aide, cercle de confiance (SMS test) |
| Lieux | Structures d'aide au Togo, filtres, appel, itinéraire Google Maps, lieux enregistrés |
| Filtre SMS | Classifieur local (mots-clés, majuscules, chantage, Floox/TMoney) + Gemini, historique, archivage au coffre |
| Zones | Zones Togo, rayon/seuil, suivi GPS dans l'app, check-in de sécurité, SOS, historique |
| Rapport | Agrégation mensuelle preuves + SMS + humeur, tendance 6 mois, plateformes, catégories, auteurs récurrents, export |
| Réglages | Thème auto/clair/sombre, profil anonyme, état des données, changement de session, effacement |
| Confidentialité | Pseudonyme, identifiant de session, aperçus masqués, biométrie, code de secours (hash salé), limites Expo Go |
| Guide | Checklist d'action immédiate avec progression persistée |

Le thème reprend exactement les couleurs, dégradés et la typographie de la version Android
(Outfit, Plus Jakarta Sans, JetBrains Mono), avec une échelle de tailles et d'interlettrages adaptée.

## Différences imposées par Expo Go

Ces fonctions du projet Android **ne peuvent pas** fonctionner dans Expo Go, car elles nécessitent du code natif :

- **Interception des SMS entrants** (`BroadcastReceiver`) : remplacée par un analyseur manuel (coller un SMS).
- **Envoi automatique de SMS** : le SOS ouvre l'app Messages avec le texte et la position préremplis.
- **Localisation en arrière-plan** : le suivi des zones s'arrête quand l'app est fermée.
- **Capture d'écran incognito** (`FLAG_SECURE`) : sans effet dans Expo Go ; le blocage est actif dans l'APK de production (`modules/seyli-sms`).
- **Firebase / Firestore / App Check / Google Sign-In** : remplacés par un stockage local (AsyncStorage).
- **Carte Google Maps intégrée** : remplacée par une liste avec itinéraires dans Google Maps.

Pour retrouver ces fonctions, il faudra une **development build** Expo (EAS) avec les modules natifs
correspondants, et non Expo Go.

## Structure

```
seyli-expo/
├── App.tsx                  # navigation, thème, chargement des polices
├── index.js                 # entrée Expo
├── app.json                 # config Expo, permissions, plugins
├── src/
│   ├── theme.ts             # palette clair/sombre, typographie
│   ├── types.ts             # modèles et libellés FR
│   ├── store.tsx            # état global + persistance AsyncStorage
│   ├── navigation.tsx       # routes et contexte
│   ├── data/static.ts       # urgences, structures, zones Togo, guide
│   ├── lib/gemini.ts        # analyse, coach, SMS, transcription
│   ├── lib/smsFilter.ts     # classifieur embarqué + analyse hors-ligne
│   ├── lib/insights.ts      # rapport mensuel
│   ├── lib/emergency.ts     # SOS, SMS, itinéraires, partage
│   ├── ui/kit.tsx           # composants (Card, Btn, Field, Sheet…)
│   └── screens/             # 11 écrans
└── .env.example
```

## Signature de production (APK)

Le keystore de release ne vit pas dans `android/` : ce dossier est régénéré à chaque
`npx expo prebuild`, et perdre la clé interdit toute mise à jour de l'application.

| Élément | Emplacement |
| --- | --- |
| Keystore | `keys/seyli-release.jks` (PKCS12, alias `seyli`, RSA 2048, validité 10 000 jours) |
| Identifiants | `keys/keystore.properties` (`storeFile`, `storePassword`, `keyAlias`, `keyPassword`) |
| Sauvegarde | `../signing-backup/` (racine du workspace, hors du dépôt) |
| Empreintes | `../signing-backup/EMPREINTES.txt` |

`keys/` est ignoré par git (`*.jks` et `keys/` dans `.gitignore`) : ces deux fichiers ne doivent
jamais être commités, mais ils doivent être sauvegardés ailleurs (voir plus bas).

### Comment la release est signée

`plugins/withReleaseSigning.js`, déclaré dans `app.json`, réapplique la configuration à chaque
prebuild — une édition manuelle de `android/app/build.gradle` serait perdue :

- il injecte un `signingConfigs.release` qui lit `../keys/keystore.properties` ;
- il remplace la signature debug de `buildTypes.release` par cette configuration ;
- si le keystore manque, toute tâche `*release*` échoue avec une `GradleException` explicite,
  au lieu de produire un APK signé avec la clé debug ;
- si le template Gradle de React Native change de structure, le plugin lève une erreur au
  prebuild et arrête la chaîne, au lieu de patcher silencieusement.

```bash
cd android
JAVA_HOME=../.toolchain/jdk-17.0.21.1+2 \
ANDROID_HOME="$LOCALAPPDATA/Android/Sdk" \
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a \
  -Pexpo.android.cmakeObjectPathMax=0
```

`-Pexpo.android.cmakeObjectPathMax=0` est nécessaire sous Windows : Expo force sinon
`CMAKE_OBJECT_PATH_MAX=1024`, CMake cesse d'abréger les noms d'objets générés et le Ninja 1.10 du
SDK échoue sur les chemins de plus de 260 caractères. La valeur 0 rend la limite CMake par défaut,
qui hache les noms trop longs.

L'APK sort dans `android/app/build/outputs/apk/release/app-release.apk`.

### Restaurer le keystore depuis `signing-backup`

Sur un nouveau poste, ou après un nettoyage :

```bash
mkdir -p keys
cp ../signing-backup/seyli-release.jks keys/
cp ../signing-backup/keystore.properties keys/
```

Le champ `storeFile` de `keystore.properties` contient un chemin absolu propre à la machine qui a
généré la clé : remplacez-le par le chemin du fichier restauré avant de builder.

Vérification de l'identité de la clé :

```bash
keytool -list -v -keystore keys/seyli-release.jks -alias seyli
```

Empreinte SHA-256 attendue :
`39:9C:74:C1:1D:8D:03:54:8F:4E:A9:D5:AD:13:6C:AD:9D:35:57:DD:FA:F0:46:81:D5:C2:16:0E:E6:28:69:7C`.
Si elle diffère, ce n'est pas la bonne clé : les mises à jour installées par-dessus l'ancienne
version seront refusées par Android.

## Publier une nouvelle version (procédure rejouable)

À dérouler dans l'ordre, sans rien sauter. Exemple avec la version `1.0.2` / `versionCode 3` :
remplace ces deux valeurs par celles de la version en cours.

### 1. Incrémenter la version dans l'app

`app.json` :

```json
"version": "1.0.2",
```

et dans le bloc `android` :

```json
"versionCode": 3
```

`versionCode` doit **toujours** augmenter, même pour une correction : Android refuse d'installer
un APK dont le `versionCode` est inférieur ou égal à celui déjà présent sur le téléphone.

### 2. Régénérer le projet natif et construire l'APK signé

Depuis la racine du dépôt de l'app (le dossier qui contient `app.json`) :

```bash
npx expo prebuild --platform android --clean
```

Le prebuild repasse par `plugins/withReleaseSigning.js` : s'il échoue, c'est que le template
Gradle a changé de structure ou que `keys/keystore.properties` a disparu — corrige avant de
continuer, ne signe jamais en debug.

```bash
cd android
JAVA_HOME=../.toolchain/jdk-17.0.21.1+2 \
ANDROID_HOME="$LOCALAPPDATA/Android/Sdk" \
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a \
  -Pexpo.android.cmakeObjectPathMax=0
```

Sous Windows, le chemin du dossier peut dépasser la limite des 260 caractères de Ninja : monter
le workspace sur un lecteur court (`subst X: C:\chemin\long\SEYLI-APP`, puis builder depuis `X:`) évite
l'erreur `Filename longer than 260 characters`. Si `hermesc.exe` fait 0 octet dans
`node_modules/react-native/sdks/hermesc/`, le build s'arrête sur « Accès refusé » : réinstalle
`hermes-compiler` (`npm install --no-save hermes-compiler`) avant de relancer.

### 3. Vérifier la signature et calculer l'empreinte

```bash
JAVA_HOME=../.toolchain/jdk-17.0.21.1+2 \
"$LOCALAPPDATA/Android/Sdk/build-tools/35.0.0/apksigner" verify --print-certs \
  app/build/outputs/apk/release/app-release.apk
```

Le certificat doit être `CN=SEYLI, OU=UNICODES Africa, O=UNICODES Africa, L=Lome, ST=Maritime, C=TG`.

Empreinte SHA-256 du **fichier** (pas du certificat), en minuscules, sur Windows :

```powershell
(Get-FileHash android/app/build/outputs/apk/release/app-release.apk -Algorithm SHA256).Hash.ToLower()
```

sur macOS/Linux :

```bash
shasum -a 256 android/app/build/outputs/apk/release/app-release.apk
```

Taille en Mo, arrondie à l'unité : `octets / 1048576`.

### 4. Créer la release GitHub

Sur https://github.com/golglom/SEYLI-APP/releases → **Draft a new release** :

1. tag `v1.0.2` (créé à la volée sur `main`) ;
2. titre `SEYLI 1.0.2` ;
3. description : identifiant `com.seyli.app`, architecture `arm64-v8a`, empreinte SHA-256 du fichier ;
4. joindre l'APK renommé `SEYLI-1.0.2.apk` (glisser-déposer) ;
5. **Publish release** — pas de brouillon : un brouillon n'est pas téléchargeable.

L'URL de téléchargement devient
`https://github.com/golglom/SEYLI-APP/releases/download/v1.0.2/SEYLI-1.0.2.apk`.

**Le dépôt doit rester public.** Un asset de release d'un dépôt privé renvoie 404 à un visiteur
anonyme : la fiche afficherait un lien mort.

### 5. Mettre à jour la fiche SEYLI du site

L'APK n'est pas servi par GitHub mais **par le site lui-même** : sur un réseau qui bloque
`github.com` ou `release-assets.githubusercontent.com`, un lien direct vers la release rendait
l'application introuvable. La copie locale supprime cette dépendance, et la release GitHub reste le
secours.

1. Copier l'APK dans le dépôt du site (`UNICODES_AFRICA`, dossier `site`), sous le nom exact de
   l'asset, puis supprimer la version précédente pour ne pas faire grossir le dépôt :

   ```bash
   cp seyli-expo/android/app/build/outputs/apk/release/app-release.apk \
      site/public/telechargements/SEYLI-1.0.2.apk
   rm site/public/telechargements/SEYLI-1.0.1.apk
   ```

   `vercel.json` ne réécrit que les chemins **sans** extension (`/((?!.*\.[a-zA-Z0-9]+$).*)`) : les
   `.apk` sont donc servis tels quels, avec leur type MIME.

2. Dans `src/pages/SeyliAppPage.tsx`, quatre blocs à changer :

| Constante | Valeur |
| --- | --- |
| `APK_URL` | `${import.meta.env.BASE_URL}telechargements/SEYLI-1.0.2.apk` |
| `APK_BACKUP_URL` | `https://github.com/golglom/SEYLI-APP/releases/latest` (ne change pas d'une version à l'autre) |
| `APK_SHA256` | l'empreinte du fichier, en minuscules |
| `APP` | `version`, `taille` (ex. `'25 Mo'`), `identifiant`, `dateVersion` |

`APK_URL` peut aussi être surchargée au build par `VITE_APK_URL` sans toucher au code.

Contrôle après déploiement : le fichier doit répondre `200` en
`application/vnd.android.package-archive` et son SHA-256 doit égaler `APK_SHA256`.

```bash
C:/windows/system32/curl.exe -sI https://www.unicodesaction.org/telechargements/SEYLI-1.0.2.apk
```

### 6. Commiter et pousser

Dans le dossier `site` de ton clone de `UNICODES_AFRICA` :

```bash
git commit -am "Publie l'APK 1.0.2 et son empreinte sur la fiche SEYLI"
git push unicodes HEAD:main
```

Vercel ne déploie que les commits dont l'auteur a accès au projet : vérifie que
`git config user.email` du dépôt vaut `zicombusiness74@gmail.com` (compte `golglom`), sinon le
déploiement est bloqué avec « commit author did not have contributing access », même si le commit
est bien arrivé sur GitHub. Pour réparer un commit déjà poussé :

```bash
git -c user.name=golglom -c user.email=zicombusiness74@gmail.com commit --amend --reset-author --no-edit
git push --force-with-lease unicodes HEAD:main
```

### 7. Vérifier en ligne

Après le build Vercel (1 à 3 minutes) :

```bash
# 1. le bundle servi a changé
curl -s "https://www.unicodesaction.org/?lang=fr" | grep -o '/assets/index-[^\"]*\.js'

# 2. il contient la nouvelle release et plus l'ancienne
curl -s "https://www.unicodesaction.org/assets/index-XXXX.js" \
  | grep -o 'releases/download/v1\.0\.2/SEYLI-1\.0\.2\.apk'

# 3. l'APK se télécharge sans authentification, en 200
curl -sIL "https://github.com/golglom/SEYLI-APP/releases/download/v1.0.2/SEYLI-1.0.2.apk" | head -n 1
```

Le téléchargement doit répondre `200` avec `content-type: application/vnd.android.package-archive`
et la taille attendue. Un `404` signifie presque toujours un dépôt repassé en privé, un tag mal
orthographié ou un asset non joint à la release publiée.

### Récapitulatif

1. `app.json` : `version` + `versionCode`.
2. `npx expo prebuild --platform android --clean`, puis `assembleRelease`.
3. `apksigner verify --print-certs` + SHA-256 du fichier.
4. Release GitHub `vX.Y.Z` avec `SEYLI-X.Y.Z.apk`, publiée, dépôt public.
5. `APK_URL`, `APK_BACKUP_URL`, `APK_SHA256`, `APP` sur la fiche SEYLI.
6. Commit poussé sur `UNICODES_AFRICA/main` avec l'identité `golglom`.
7. Vérification du bundle en ligne et du lien de téléchargement.

Facultatif, pour les testeurs : joindre en second asset la variante
`SEYLI-X.Y.Z-x86_64-emulator.apk` (§4 bis). Elle ne remplace jamais l'APK téléphone, n'est pas liée
depuis la fiche du site, et porte le même `versionCode` : la réinstaller sur un appareil déjà doté de
l'APK arm ne fait pas une mise à jour.

## Valider un APK sur émulateur (recette rejouable)

Sert à prouver qu'un build **démarre vraiment** (splash libéré, UI affichée, aucune erreur de
démarrage) sans téléphone physique. À dérouler dans l'ordre : un maillon cassé fausse la suite
sans le dire.

### 1. S'assurer que le paquet `emulator` du SDK est sain

Un paquet `emulator` extrait à moitié laisse des exécutables **de 0 octet**. Symptômes :
`emulator -list-avds` échoue, et sur un appareil démarré `adb shell id` / `ls` / `cat` répondent
`error: closed` alors que `getprop` fonctionne.

```powershell
Get-ChildItem "$env:LOCALAPPDATA\Android\Sdk\emulator" |
  Where-Object { $_.Length -eq 0 -and $_.Extension -eq '.exe' } |
  Select-Object Name, Length
```

Si la liste n'est pas vide, ne répare pas le SDK en place : télécharge le paquet officiel et
extrais-le hors du SDK.

```powershell
# 1. révision courante du paquet
Invoke-WebRequest https://dl.google.com/android/repository/repository2-3.xml -OutFile repo2.xml
Select-String -Path repo2.xml -Pattern 'emulator-windows_x64'     # -> emulator-windows_x64-<rev>.zip

# 2. télécharger (≈ 450 Mo) puis extraire : l'archive contient un dossier emulator/
Invoke-WebRequest https://dl.google.com/android/repository/emulator-windows_x64-<rev>.zip -OutFile emulator.zip
Expand-Archive emulator.zip -DestinationPath .toolchain/emulator-new
```

Contrôle : `emulator.exe` ≈ 23 Mo et `qemu\windows-x86_64\qemu-system-x86_64.exe` ≈ 67 Mo.
Sous Git Bash, `curl.exe` résolu par le PATH peut être une copie de 0 octet : utilise
`C:/windows/system32/curl.exe` ou `Invoke-WebRequest`.

### 2. Vérifier l'image système

L'APK publié est `arm64-v8a` : il ne s'installe pas sur un émulateur x86_64. On valide donc la
**variante x86_64 du même commit** (voir §4).

```bash
ls "$LOCALAPPDATA/Android/Sdk/system-images"
```

Image retenue : `system-images\android-37.0\google_apis_playstore\x86_64` (`system.img` ≈ 2,7 Go).
Les images `google_apis` pures s'arrêtent à l'API 34 ; `google_apis_playstore` est la même base AOSP
avec les services Google en plus — suffisant pour valider le démarrage et les flux locaux.

### 3. Créer l'AVD à la main

`avdmanager` se bloque sur certaines installations ; deux fichiers suffisent et rendent l'AVD
reproductible.

`%USERPROFILE%\.android\avd\SEYLI_A37.ini` (doubler les antislashs dans `path`) :

```ini
avd.ini.encoding=UTF-8
path=C:\\Users\\<toi>\\.android\\avd\\SEYLI_A37.avd
path.rel=avd\SEYLI_A37.avd
target=android-37.0
```

`%USERPROFILE%\.android\avd\SEYLI_A37.avd\config.ini` :

```ini
avd.ini.displayname=SEYLI_A37
avd.ini.encoding=UTF-8
AvdId=SEYLI_A37
abi.type=x86_64
hw.cpu.arch=x86_64
hw.cpu.ncore=4
hw.ramSize=2048
vm.heapSize=256
disk.dataPartition.size=6442450944
disk.cachePartition.size=67108864
hw.lcd.width=1080
hw.lcd.height=2400
hw.lcd.density=420
hw.lcd.backlight=yes
hw.gpu.enabled=yes
hw.gpu.mode=swiftshader_indirect
hw.keyboard=yes
hw.mainKeys=no
hw.audioInput=no
hw.audioOutput=no
hw.sdCard=no
hw.camera.back=none
hw.camera.front=none
hw.accelerometer=yes
hw.gyroscope=yes
hw.sensors.proximity=yes
image.sysdir.1=system-images\android-37.0\google_apis_playstore\x86_64\
tag.id=google_apis_playstore
tag.display=Google Play
tag.displaynames=Google Play
tag.ids=google_apis_playstore
PlayStore.enabled=true
fastboot.forceColdBoot=yes
fastboot.forceFastBoot=no
showDeviceFrame=no
skin.dynamic=yes
skin.name=1080x2400
firstboot.bootFromDownloadableSnapshot=no
firstboot.bootFromInitialSnapshot=no
```

### 4. Construire la variante x86_64

Même chaîne que la release, une seule variable change :

```bash
cd android
JAVA_HOME=../.toolchain/jdk-17.0.21.1+2 \
ANDROID_HOME="$LOCALAPPDATA/Android/Sdk" \
./gradlew assembleRelease -PreactNativeArchitectures=x86_64 \
  -Pexpo.android.cmakeObjectPathMax=0
```

L'APK reste signé par la clé de release (même plugin). Il sort dans
`android/app/build/outputs/apk/release/app-release.apk` : c'est une **variante de test**. Elle est
jointe à la release sous un nom explicite (§4 bis), mais la fiche du site ne pointe **jamais**
dessus : le téléchargement public reste `arm64-v8a`.

### 4 bis. Joindre la variante à la release

Nom imposé : `SEYLI-<version>-x86_64-emulator.apk`. Le suffixe empêche qu'un visiteur le prenne
pour l'APK téléphone — Android refuse d'installer un binaire x86_64 sur un appareil arm, avec un
« App not installed » sans autre explication.

Via l'interface : release `vX.Y.Z` → **Edit** → glisser l'APK dans *Attach binaries by dropping them
here* → **Update release**. Via l'API, depuis la racine du workspace :

```bash
node ../.toolchain/attach-x86-asset.cjs v1.0.2 \
  android/app/build/outputs/apk/release/app-release.apk \
  SEYLI-1.0.2-x86_64-emulator.apk
```

Ce helper local réutilise les identifiants git du poste (jamais affichés), ne renvoie pas l'asset
s'il existe déjà, complète les notes de release d'un bloc « Variante émulateur / ChromeOS » avec
l'avertissement et l'empreinte, puis re-télécharge le fichier **sans authentification** pour
comparer les SHA-256.

Vérification de l'accès public :

```bash
C:/windows/system32/curl.exe -sIL \
  https://github.com/golglom/SEYLI-APP/releases/download/v1.0.2/SEYLI-1.0.2-x86_64-emulator.apk \
  | grep -i -m2 -E "^HTTP|content-type"
```

Attendu : `200` et `content-type: application/vnd.android.package-archive`.

### 5. Démarrer l'émulateur

Port explicite : `5554` est souvent déjà occupé par un autre émulateur (BlueStacks & co.), qui
répond `device` à `adb devices` mais refuse toute commande shell — c'est le piège classique.

```bash
EMU=../.toolchain/emulator-new/emulator/emulator.exe    # depuis seyli-expo/
"$EMU" -avd SEYLI_A37 -port 5590 -no-window -no-audio -no-snapshot -no-boot-anim \
  -gpu swiftshader_indirect
```

Boot : 30 à 60 s en GPU logiciel. `getprop` répond avant que le userland soit prêt : attends
`sys.boot_completed`, puis valide par une vraie commande.

```bash
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
"$ADB" -s emulator-5590 wait-for-device
"$ADB" -s emulator-5590 shell getprop sys.boot_completed    # 1
"$ADB" -s emulator-5590 shell id                             # uid=2000(shell)…
```

### 6. Installer et vérifier le rendu

```bash
"$ADB" -s emulator-5590 install -r -g android/app/build/outputs/apk/release/app-release.apk
"$ADB" -s emulator-5590 logcat -c
"$ADB" -s emulator-5590 shell am start -W -n com.seyli.app/.MainActivity
```

Vérifier le **contenu**, pas seulement « l'activité a démarré » :

```bash
# 1. activité au premier plan, fenêtre dessinée, process vivant
"$ADB" -s emulator-5590 shell dumpsys activity activities    # topResumedActivity, allDrawn=true
"$ADB" -s emulator-5590 shell pidof com.seyli.app

# 2. arbre d'accessibilité : les textes réels de l'écran
"$ADB" -s emulator-5590 shell uiautomator dump /sdcard/ui.xml
"$ADB" -s emulator-5590 shell cat /sdcard/ui.xml

# 3. aucune erreur de démarrage
"$ADB" -s emulator-5590 logcat -d -v brief      # ReactNativeJS, AndroidRuntime, FATAL
```

Attendu au premier lancement : l'onboarding (« Ta protection, dans ta poche. »,
« Continuer avec cet appareil »). Aux lancements suivants : l'accueil (« Bonjour … », « SOS 3018 »,
compteurs PREUVES / PROCHES SOS). `ReactNativeJS: Running "main"` = bundle JS démarré ; des textes
métier + `allDrawn=true` + aucun `FATAL EXCEPTION` = rendu validé, pas seulement le splash.

Puis une relance à froid, pour prouver que l'écran de lancement ne revient pas :

```bash
"$ADB" -s emulator-5590 shell am force-stop com.seyli.app
"$ADB" -s emulator-5590 shell am start -W -n com.seyli.app/.MainActivity
```

### 7. Vérifier aussi l'APK publié (sans l'installer)

L'APK `arm64-v8a` ne s'installe pas sur l'émulateur x86_64 : on contrôle son identité et son bundle.

```bash
C:/windows/system32/curl.exe -L -o SEYLI.apk \
  https://github.com/golglom/SEYLI-APP/releases/download/v1.0.2/SEYLI-1.0.2.apk
sha256sum SEYLI.apk                       # doit égaler APK_SHA256 de la fiche
unzip -o SEYLI.apk assets/index.android.bundle -d bundle-check
grep -c preventAutoHideAsync bundle-check/assets/index.android.bundle   # > 0
```

Le manifeste se lit avec `aapt dump badging SEYLI.apk` (`versionName`, `versionCode`,
`native-code: 'arm64-v8a'`).

La variante émulateur se contrôle de la même façon, en remplaçant `SEYLI.apk` par
`SEYLI-<version>-x86_64-emulator.apk` ; son SHA-256 doit être celui affiché dans les notes de
release, et `native-code: 'x86_64'`.

### 8. Arrêter proprement

```powershell
$p = Get-Process -Name 'emulator' | Select-Object -First 1
taskkill /PID $p.Id /T /F      # tue aussi qemu-system-x86_64-headless
```

Ne jamais arrêter par motif de nom (`pkill -f`, `killall`) : la ligne de commande de l'agent peut
contenir les mêmes mots. Un émulateur headless consomme ~4,4 Go de RAM.

### Pièges connus de cet environnement

| Symptôme | Cause / contournement |
| --- | --- |
| `adb devices` liste un appareil, mais `adb shell id` renvoie `error: closed` | Émulateur tiers (fingerprint Samsung, SDK 25) sur le port 5554 : démarrer le nôtre sur un autre port |
| `System UI isn't responding` au premier boot | GPU logiciel lent : taper **Wait** et laisser 5 s |
| `adb shell "dumpsys … \| grep …"` : `grep: inaccessible or not found` | Le pipe est éclaté par adb : filtrer côté hôte, pas dans la commande distante |
| `adb shell input text` perd les caractères d'une longue phrase | Injection plus rapide que le thread JS sur émulateur 2 Go : envoyer par morceaux de 10 à 20 caractères, sans accents, espace = `%s` |
| `rm`, `curl`, `git` semblent ne rien faire | Copies de 0 octet dans le PATH de l'outillage : `Remove-Item`, `C:/windows/system32/curl.exe`, `"C:/Program Files/Git/cmd/git.exe"` |
| Variables `$` vides dans une commande PowerShell en ligne | Bash les expanse avant appel : écrire les scripts dans un fichier `.ps1` et lancer `powershell -File` |
| Galerie : « Capture » ne joint aucune image | Défaut connu du build 1.0.2 (URI du photo picker non lisible, `Glide setDataSource failed`) : utilisable ni pour valider ni comme preuve |

## Vérification

Le code n'a pas pu être compilé dans l'environnement de génération (terminal indisponible).
Lance `npx expo start` puis ouvre le projet dans Expo Go : les erreurs éventuelles s'afficheront
dans le terminal Metro et dans l'app. `npx tsc --noEmit` permet aussi de vérifier les types.
