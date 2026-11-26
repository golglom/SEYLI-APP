const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Keeps the release signing configuration alive across `expo prebuild`.
 *
 * `android/` is generated, so an edit made by hand there disappears the next
 * time the native project is regenerated. This plugin re-applies the same
 * configuration on every prebuild: the release variant is signed with the
 * production keystore described by `keys/keystore.properties` (kept outside the
 * generated folder and out of git).
 *
 * It refuses to patch silently. If a future React Native template renames or
 * restructures the blocks below, the plugin throws and the build stops, instead
 * of shipping a release signed with the debug key.
 */

const MARKER = '@generated seyli-release-signing';

const DEBUG_BLOCK = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }`;

const RELEASE_BLOCK = `
        // ${MARKER}
        release {
            def keystoreProps = new Properties()
            def keystoreFile = rootProject.file('../keys/keystore.properties')
            if (keystoreFile.exists()) {
                keystoreFile.withInputStream { keystoreProps.load(it) }
                storeFile file(keystoreProps.getProperty('storeFile'))
                storePassword keystoreProps.getProperty('storePassword')
                keyAlias keystoreProps.getProperty('keyAlias')
                keyPassword keystoreProps.getProperty('keyPassword')
            }
        }`;

const TEMPLATE_RELEASE_SIGNING = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

const PRODUCTION_RELEASE_SIGNING = `        release {
            // Signed with the production keystore described by
            // keys/keystore.properties; a missing keystore must fail the build
            // rather than silently fall back to the debug key.
            def releaseKeystore = rootProject.file('../keys/keystore.properties')
            def hasReleaseKeystore = releaseKeystore.exists()
            if (!hasReleaseKeystore && gradle.startParameter.taskNames.any { it.toLowerCase().contains('release') }) {
                throw new GradleException(
                    'Keystore de production introuvable : ' + releaseKeystore +
                    '. Restaurez keys/seyli-release.jks et keys/keystore.properties depuis signing-backup/.'
                )
            }
            signingConfig hasReleaseKeystore ? signingConfigs.release : signingConfigs.debug`;

function fail(reason) {
  throw new Error(
    `[withReleaseSigning] ${reason}\n` +
      "Le template Gradle de React Native a changé : le plugin ne sait plus garantir " +
      'une release signée avec la clé de production. Corrigez plugins/withReleaseSigning.js ' +
      'avant de publier, sinon l’APK sortirait signé avec la clé debug.'
  );
}

/** Pure patch, exported so it can be tested without running a prebuild. */
function patchBuildGradle(contents) {
  if (typeof contents !== 'string' || contents.length === 0) {
    fail('android/app/build.gradle est vide ou illisible.');
  }

  if (!contents.includes(MARKER) && !contents.includes(DEBUG_BLOCK)) {
    fail('Bloc signingConfigs.debug introuvable dans android/app/build.gradle.');
  }

  const alreadyPatched = contents.includes(MARKER);
  const hasTemplateRelease = contents.includes(TEMPLATE_RELEASE_SIGNING);
  const hasPatchedRelease = contents.includes(PRODUCTION_RELEASE_SIGNING);

  if (!alreadyPatched && !hasTemplateRelease) {
    fail('Bloc release signé par la clé debug introuvable dans buildTypes.');
  }

  let patched = contents;

  if (!alreadyPatched) {
    patched = patched.replace(DEBUG_BLOCK, DEBUG_BLOCK + RELEASE_BLOCK);
  }

  if (hasTemplateRelease) {
    patched = patched.replace(TEMPLATE_RELEASE_SIGNING, PRODUCTION_RELEASE_SIGNING);
  }

  if (!patched.includes(MARKER)) {
    fail('Le bloc de signature production n’a pas pu être inséré.');
  }
  if (!patched.includes(PRODUCTION_RELEASE_SIGNING)) {
    fail('La variante release utilise toujours la clé debug après le patch.');
  }

  return patched;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = patchBuildGradle(cfg.modResults.contents);
    return cfg;
  });
};

module.exports.patchBuildGradle = patchBuildGradle;
module.exports.MARKER = MARKER;
