/**
 * Optional native modules are loaded on demand.
 *
 * On Android, Expo Go 58 can fail to register native modules when a project is
 * opened after another one in the same session (expo/expo#54020). A top-level
 * `import` of such a module then crashes the app before the first screen, with
 * "Cannot find native module 'ExpoCrypto'" and the like. Loading them lazily
 * keeps that failure local: neither helper below can throw.
 */

type HapticFeedback = 'success' | 'selection';

let hapticsEnabled = true;

/**
 * React Native exposes no haptics preference, so the shell mirrors the OS
 * "reduce motion" choice: decorative taps stay silent when motion is reduced.
 */
export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

/** Fire-and-forget haptic. Missing or failing haptics are silently ignored. */
export async function haptic(feedback: HapticFeedback = 'selection'): Promise<void> {
  if (!hapticsEnabled) return;
  try {
    const Haptics = await import('expo-haptics');
    await (feedback === 'success'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : Haptics.selectionAsync());
  } catch {
    // Decorative feedback: never surface an error.
  }
}

/** Returns false when the clipboard module is unavailable or refuses the write. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    const Clipboard = await import('expo-clipboard');
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}
