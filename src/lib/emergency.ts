import { Alert, Linking, PermissionsAndroid, Platform, Share } from 'react-native';
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
 * `SEND_SMS` is a runtime permission on Android 6+: without it the native
 * module throws, and the SOS would silently fall back to the composer.
 */
async function ensureSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const sms = PermissionsAndroid.PERMISSIONS.SEND_SMS;
    // Some telephony stacks resolve the sending subscription through an API
    // guarded by READ_PHONE_STATE and throw `getGroupIdLevel1` without it, so the
    // SMS would never leave the phone. Both are requested together, once.
    const phoneState = PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE;
    const hasSms = await PermissionsAndroid.check(sms);
    const hasPhoneState = await PermissionsAndroid.check(phoneState);
    if (hasSms && hasPhoneState) return true;

    const statuses = await PermissionsAndroid.requestMultiple([sms, phoneState]);
    return (
      statuses[sms] === PermissionsAndroid.RESULTS.GRANTED &&
      statuses[phoneState] === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch {
    return false;
  }
}

export interface SosDelivery {
  outcome: 'sent' | 'composer';
  recipients: number;
  /** Why the direct send was skipped, shown to the user and logged for support. */
  reason?: string;
}

/**
 * Delivers the alert through the native module, without the user having to press
 * "Envoyer": a build that holds SEND_SMS sends it directly, which is the point of
 * a one-tap SOS. iOS, Expo Go and builds without the module report why so the
 * caller can explain the fallback instead of silently opening a composer.
 */
async function sendDirect(phones: string[], body: string): Promise<SosDelivery> {
  const recipients = cleanPhones(phones);
  if (!recipients.length) return { outcome: 'composer', recipients: 0, reason: 'Aucun numéro.' };
  if (Platform.OS !== 'android') {
    return { outcome: 'composer', recipients: recipients.length, reason: 'iOS ouvre toujours Messages.' };
  }

  let module: typeof import('../../modules/seyli-sms/src');
  try {
    module = await import('../../modules/seyli-sms/src');
  } catch {
    return { outcome: 'composer', recipients: recipients.length, reason: 'Module SMS absent du build.' };
  }
  if (!module.isSmsModuleAvailable) {
    return { outcome: 'composer', recipients: recipients.length, reason: 'Module SMS absent du build.' };
  }
  if (!(await ensureSmsPermission())) {
    return { outcome: 'composer', recipients: recipients.length, reason: 'Permission d’envoi refusée.' };
  }

  try {
    const result = await module.sendSmsDirectly(recipients, body);
    if (result.recipients > 0) {
      return { outcome: 'sent', recipients: result.recipients };
    }
    return { outcome: 'composer', recipients: recipients.length, reason: 'Le téléphone a refusé l’envoi.' };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { outcome: 'composer', recipients: recipients.length, reason };
  }
}

/**
 * Sends the message directly when the device allows it, otherwise opens the
 * Messages composer with everything pre-filled. Returns how it was handled so
 * screens can adapt their confirmation copy.
 */
export async function sendSmsOrCompose(phones: string[], body: string): Promise<SosDelivery> {
  const direct = await sendDirect(phones, body);
  if (direct.outcome === 'sent') return direct;
  if (direct.reason) console.warn('[SEYLI SOS] envoi direct impossible :', direct.reason);
  openSms(phones, body);
  return direct;
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

/**
 * Best-effort position for the SOS message.
 *
 * `getCurrentPositionAsync` can wait for a fix indefinitely indoors, in a car or
 * on a device with location services off — and an SOS that waits for the GPS is
 * an SOS that never sends the SMS. The alert therefore goes out with the last
 * known position, or without one, after a short budget.
 */
export async function locate(timeoutMs = 3500): Promise<SosLocation> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return {};

    const last = await Location.getLastKnownPositionAsync({ maxAge: 15 * 60 * 1000 }).catch(
      () => null
    );
    if (last) {
      return { latitude: last.coords.latitude, longitude: last.coords.longitude };
    }

    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
    if (!position) return {};
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
  const delivery = await sendSmsOrCompose(phones, message);

  // No automatic `tel:3018`: it used to fire only when coming back from the
  // composer, which opened the dialer behind the alert and looked like a second,
  // unrelated action. The call is now an explicit choice in the confirmation.
  if (delivery.outcome === 'sent') {
    Alert.alert(
      'Alerte SOS envoyée',
      `Le message et ta position sont partis vers ${delivery.recipients} proche(s). Tu peux maintenant appeler les secours.`,
      [
        { text: 'Fermer', style: 'cancel' },
        { text: 'Appeler 3018', onPress: () => dial('3018') },
      ]
    );
    return;
  }

  Alert.alert(
    'Alerte prête dans Messages',
    `SEYLI n’a pas pu envoyer directement (${delivery.reason ?? 'raison inconnue'}). Le SMS et ta position sont préremplis : appuie sur Envoyer pour qu’il parte.`,
    [
      { text: 'Fermer', style: 'cancel' },
      { text: 'Appeler 3018', onPress: () => dial('3018') },
    ]
  );
}
