import { requireOptionalNativeModule } from 'expo-modules-core';

export interface SmsSendResult {
  recipients: number;
  parts: number;
}

interface SeyliSmsNativeModule {
  canSend(): boolean;
  send(addresses: string[], message: string): Promise<SmsSendResult>;
  setSecureScreen(enabled: boolean): boolean;
}

/**
 * `requireOptionalNativeModule` plutôt que `requireNativeModule` : sur iOS ou sur
 * un build sans le module, l'absence doit laisser l'app démarrer et retomber sur
 * le composeur, pas provoquer un écran rouge.
 */
const native = requireOptionalNativeModule<SeyliSmsNativeModule>('SeyliSms');

export const isSmsModuleAvailable = native != null;

export function canSendSmsDirectly(): boolean {
  try {
    return native?.canSend() ?? false;
  } catch {
    return false;
  }
}

export function sendSmsDirectly(addresses: string[], message: string): Promise<SmsSendResult> {
  if (!native) return Promise.reject(new Error('Module SMS natif indisponible.'));
  return native.send(addresses, message);
}

/** Bloque (ou rétablit) les captures et enregistrements d'écran sur Android. */
export function setSecureScreen(enabled: boolean): boolean {
  try {
    return native?.setSecureScreen(enabled) ?? false;
  } catch {
    return false;
  }
}
