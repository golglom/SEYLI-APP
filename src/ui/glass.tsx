import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReduceTransparency } from '../lib/a11y';
import { useApp } from '../store';

/**
 * Frosted panel for chrome that sits over scrolling content (floating tab bar,
 * hero badges).
 *
 * iOS uses the native material, so the content really is blurred while it slides
 * underneath. On Android a per-frame RenderEffect is expensive on the phones
 * SEYLI targets, and expo-blur only blurs on Android 12+ anyway, so the panel
 * stays translucent instead of blurred.
 *
 * Do not rely on blur inside a `Modal`: the modal is a separate presentation, so
 * the backdrop may not be blurrable at all. Pass `blur={false}` there and the
 * panel becomes a plain translucent surface that looks identical on both
 * platforms.
 */
export function Glass({
  children,
  style,
  intensity = 42,
  appearance = 'auto',
  tintColor,
  blur = true,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  /** Force the material's tone, e.g. "dark" for panels laid over the hero gradient. */
  appearance?: 'auto' | 'dark' | 'light';
  /** Colour laid over the material, keeping text contrast on brand surfaces. */
  tintColor?: string;
  /** Disable the native blur (modal sheets, reduced transparency). */
  blur?: boolean;
}) {
  const { palette } = useApp();
  const reduceTransparency = useReduceTransparency();
  const isDark = appearance === 'auto' ? palette.isDark : appearance === 'dark';

  const sheen = tintColor ?? (isDark ? 'rgba(16, 12, 22, 0.34)' : 'rgba(255, 255, 255, 0.38)');
  const translucent = tintColor ?? (isDark ? 'rgba(22, 17, 28, 0.96)' : 'rgba(255, 255, 255, 0.97)');
  // Dropping the alpha keeps the intended colour when translucency is disabled.
  const solid =
    tintColor && /^#[0-9A-Fa-f]{8}$/.test(tintColor)
      ? tintColor.slice(0, 7)
      : isDark
        ? '#141019'
        : '#FFFFFF';

  if (blur && !reduceTransparency && Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={intensity}
        tint={isDark ? 'dark' : 'light'}
        style={[{ overflow: 'hidden' }, style]}
      >
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: sheen }]} />
        {children}
      </BlurView>
    );
  }

  return (
    <View
      style={[
        { overflow: 'hidden', backgroundColor: reduceTransparency ? solid : translucent },
        style,
      ]}
    >
      {children}
    </View>
  );
}
