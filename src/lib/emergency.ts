import { Alert, Linking, Platform, Share } from 'react-native';
import * as Location from 'expo-location';
import type { TrustedContact } from '../types';

export function dial(number: string) {
  const clean = number.replace(/[^\d+*#]/g, '');
  if (!clean) return;
  Linking.openURL(`tel:${clean}`).catch(() =>
    Alert.alert('Appel impossible', 'Cet appareil ne peut pas lancer d’appel.')
  );
}

function cleanPhones(phones: string[]) {
  return phones.map((p) => p.replace(/[^\d+]/g, '')).filter(Boolean);
}

export function openSms(phones: string[], body: string) {
  const recipients = cleanPhones(phones);
  if (!recipients.length) {
    Alert.alert('Aucun proche', 'Ajoute d’abord un proche de confiance dans le Cercle de confiance.');
    return;
  }
  const separator = Platform.OS === 'ios' ? ',' : ';';
  const url = `sms:${recipients.join(separator)}?body=${encodeURIComponent(body)}`;
  Linking.openURL(url).catch(() =>
    Alert.alert('SMS indisponible', 'Ouvre l’application Messages pour envoyer l’alerte.')
  );
}

/**
 * Delivers the alert with the SMS module, without the user having to press
 * "Envoyer": on Android a build that holds SEND_SMS sends it directly, which is
 * the point of a one-tap SOS. iOS and Expo Go always show the composer, and any
 * unavailable module simply reports a failure so the caller can fall back.
 */
async function sendDirect(phones: string[], body: string): Promise<boolean> {
  const recipients = cleanPhones(phones);
  if (!recipients.length) return false;
  try {
    const SMS = await import('expo-sms');
    if (!(await SMS.isAvailableAsync())) return false;
    const { result } = await SMS.sendSMSAsync(recipients, body);
    return result !== 'cancelled' && result !== 'unknown';
  } catch {
    return false;
  }
}

/**
 * Sends the message directly when the device allows it, otherwise opens the
 * Messages composer with everything pre-filled. Returns how it was handled so
 * screens can adapt their confirmation copy.
 */
export async function sendSmsOrCompose(
  phones: string[],
  body: string
): Promise<'sent' | 'composer'> {
  if (await sendDirect(phones, body)) return 'sent';
  openSms(phones, body);
  return 'composer';
}

export async function shareText(title: string, body: string) {
  try {
    await Share.share({ title, message: body });
  } catch {
    // User dismissed the sheet.
  }
}

export function openInMaps(latitude: number, longitude: number, label: string) {
  const encoded = encodeURIComponent(label);
  const geo = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encoded})`;
  Linking.openURL(geo).catch(() =>
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    ).catch(() => {})
  );
}

export interface SosLocation {
  latitude?: number;
  longitude?: number;
}

export async function locate(): Promise<SosLocation> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return {};
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return {};
  }
}

export function buildSosMessage(alias: string, position?: SosLocation): string {
  const time = new Date().toLocaleString('fr-FR');
  const mapLink =
    position?.latitude != null && position?.longitude != null
      ? `\nPosition : https://www.google.com/maps/search/?api=1&query=${position.latitude},${position.longitude}`
      : '\nPosition : non disponible';
  return [
    'SEYLI — ALERTE SOS',
    `${alias || 'Anonyme'} a besoin d’aide immédiatement.`,
    `Heure : ${time}`,
    mapLink,
    '',
    'Si tu peux, appelle-la et préviens un adulte de confiance.',
    'Urgences Togo : Allô 1011 • Police 117 • Gendarmerie 172 • 3018',
  ].join('\n');
}

export async function triggerSos(contacts: TrustedContact[], alias: string) {
  const phones = contacts.map((c) => c.phone);
  if (!phones.length) {
    Alert.alert(
      'Aucun proche enregistré',
      'Ajoute un proche de confiance dans l’onglet Coach → Cercle de confiance.'
    );
    return;
  }
  const position = await locate();
  const message = buildSosMessage(alias, position);
  await sendSmsOrCompose(phones, message);
  dial('3018');
}
