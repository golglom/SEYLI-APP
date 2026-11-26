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

### Clé Gemini (optionnelle)

Sans clé, l'app fonctionne en mode 100 % local : moteur SMS embarqué, coach de secours, données locales.

```bash
cp .env.example .env
# puis renseigne EXPO_PUBLIC_GEMINI_API_KEY dans .env
```

Après modification du `.env`, relance `npx expo start -c` pour vider le cache Metro.
La clé est visible dans le bundle (préfixe `EXPO_PUBLIC_`) : utilise une clé de test, jamais une clé de production.

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
- **Capture d'écran incognito** (`FLAG_SECURE`) : option présente mais sans effet.
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

## Vérification

Le code n'a pas pu être compilé dans l'environnement de génération (terminal indisponible).
Lance `npx expo start` puis ouvre le projet dans Expo Go : les erreurs éventuelles s'afficheront
dans le terminal Metro et dans l'app. `npx tsc --noEmit` permet aussi de vérifier les types.
