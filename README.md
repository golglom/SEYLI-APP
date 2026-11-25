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

## Vérification

Le code n'a pas pu être compilé dans l'environnement de génération (terminal indisponible).
Lance `npx expo start` puis ouvre le projet dans Expo Go : les erreurs éventuelles s'afficheront
dans le terminal Metro et dans l'app. `npx tsc --noEmit` permet aussi de vérifier les types.
