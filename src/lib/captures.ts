import * as FileSystem from 'expo-file-system/legacy';

/**
 * Dossier des captures conservées avec les preuves (documentDirectory survit aux
 * nettoyages de cache, contrairement au dossier temporaire du picker).
 */
const CAPTURE_DIR = `${FileSystem.documentDirectory ?? ''}captures/`;

export interface PickedImage {
  uri: string;
  base64: string;
  mimeType: string;
}

function extensionFor(mimeType: string) {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('heic') || mimeType.includes('heif')) return 'heic';
  return 'jpg';
}

/**
 * Recopie la capture dans le stockage de l'app et renvoie une URI `file://`.
 *
 * Le sélecteur Android rend une URI `content://media/picker/...` : Glide, le
 * chargeur d'images de React Native, n'arrive pas à la relire une fois
 * l'activité du sélecteur refermée (`setDataSource failed: status = 0x80000000`),
 * d'où une capture jamais affichée ni archivée. Les octets sont déjà en mémoire
 * (`base64`), on les écrit donc nous-mêmes : l'aperçu, l'analyse et la preuve
 * pointent ensuite vers un fichier que l'app possède.
 */
export async function persistCapture(base64: string, mimeType: string): Promise<string> {
  if (!FileSystem.documentDirectory) {
    throw new Error('Stockage interne indisponible sur cet appareil.');
  }
  const info = await FileSystem.getInfoAsync(CAPTURE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CAPTURE_DIR, { intermediates: true });
  }
  const uri = `${CAPTURE_DIR}capture-${Date.now()}.${extensionFor(mimeType)}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return uri;
}

/** Supprime une capture devenue inutile (retrait avant analyse, preuve effacée). */
export async function discardCapture(uri?: string) {
  if (!uri || !uri.startsWith(CAPTURE_DIR)) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
}
