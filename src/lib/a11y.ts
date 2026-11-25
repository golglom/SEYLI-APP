import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Reads an OS accessibility preference and keeps following it while the app is
 * running, so toggling it in the system settings applies without a restart.
 */
function useAccessibilityFlag(
  read: () => Promise<boolean>,
  event: 'reduceMotionChanged' | 'reduceTransparencyChanged'
): boolean {
  const [value, setValue] = useState(false);

  useEffect(() => {
    let active = true;
    read()
      .then((next) => {
        if (active) setValue(next);
      })
      .catch(() => {
        // Preference unavailable: keep the richer, animated default.
      });
    const subscription = AccessibilityInfo.addEventListener(event, setValue);
    return () => {
      active = false;
      subscription.remove();
    };
  }, [read, event]);

  return value;
}

const readReduceMotion = () => AccessibilityInfo.isReduceMotionEnabled();
const readReduceTransparency = () => AccessibilityInfo.isReduceTransparencyEnabled();

/** "Réduire les animations": skip route fades, tab springs and decorative haptics. */
export const useReduceMotion = () => useAccessibilityFlag(readReduceMotion, 'reduceMotionChanged');

/** "Réduire la transparence": replace frosted panels with an opaque surface. */
export const useReduceTransparency = () =>
  useAccessibilityFlag(readReduceTransparency, 'reduceTransparencyChanged');
