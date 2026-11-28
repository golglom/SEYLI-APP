import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReduceTransparency } from '../lib/a11y';
import { useApp } from '../store';
import { radius } from '../theme';
import { AppText, Screen } from './kit';

// Shared kit primitives, re-exported so every bento screen has one import source.
export {
  AppText,
  Badge,
  Badge as BentoBadge,
  Btn,
  Btn as BentoBtn,
  Chip as BentoChip,
  EmptyState as BentoEmptyState,
  Field as BentoField,
  ToggleRow as BentoToggle,
} from './kit';

export type BentoTone = 'glass' | 'soft' | 'alt' | 'danger';

export function BentoGrid({ children, gap = 10, style }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export function BentoRow({ children, gap = 10, style }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'stretch', gap }, style]}>{children}</View>;
}

export function BentoColumn({ children, gap = 10, flex = 1, style }: { children: React.ReactNode; gap?: number; flex?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flex, gap }, style]}>{children}</View>;
}

export function BentoTile({ children, onPress, tone = 'glass', height, flex, style, contentStyle, accessibilityLabel }: { children: React.ReactNode; onPress?: () => void; tone?: BentoTone; height?: number; flex?: number; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle>; accessibilityLabel?: string }) {
  const { palette } = useApp();
  const reduceTransparency = useReduceTransparency();
  const isDanger = tone === 'danger';

  const surface = isDanger
    ? { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.28)' }
    : {
        backgroundColor: reduceTransparency
          ? palette.surface
          : tone === 'soft' || tone === 'alt'
            ? palette.isDark
              ? 'rgba(31,24,38,0.86)'
              : 'rgba(255,255,255,0.78)'
            : palette.isDark
              ? 'rgba(36,28,45,0.66)'
              : 'rgba(255,255,255,0.62)',
        borderColor: palette.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.95)',
      };

  // Only cells with an imposed height (or flex) need their content to fill the tile;
  // auto-height panels must keep their natural height, otherwise a ScrollView measures
  // them with the viewport as max height and they stretch.
  const fills = height !== undefined || flex !== undefined;

  const body = (
    <>{isDanger ? (
      <LinearGradient
        colors={['#F0455F', '#A21434']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
    ) : null}
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 18,
        right: 18,
        height: 1,
        backgroundColor: isDanger ? 'rgba(255,255,255,0.5)' : palette.isDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.95)',
      }}
    />
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: radius.lg - 1,
        borderWidth: 1,
        borderColor: palette.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(24,15,29,0.06)',
      }}
    />
    <View style={[{ padding: 14, gap: 8 }, fills ? { flex: 1 } : null, contentStyle]}>{children}</View>
    </>
  );

  const base: StyleProp<ViewStyle> = [
    {
      borderRadius: radius.lg,
      borderWidth: 1,
      overflow: 'hidden',
      ...(Platform.OS === 'ios'
        ? {
            shadowColor: palette.glow,
            shadowOpacity: 0.1,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
          }
        : { elevation: 0 }),
    },
    surface,
    height !== undefined ? { height } : null,
    flex !== undefined ? { flex } : null,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [base, pressed ? { opacity: 0.9, transform: [{ scale: 0.985 }] } : null]}
      >
        {body}
      </Pressable>
    );
  }

  return <View style={base}>{body}</View>;
}

/** Page frame shared by every bento screen. */
export function BentoScreen({ children, contentStyle, gap = 14, backdropHeight = 2400 }: { children: React.ReactNode; contentStyle?: StyleProp<ViewStyle>; gap?: number; backdropHeight?: number }) {
  return (
    <Screen contentStyle={[{ gap }, contentStyle]}><GlassBackdrop height={backdropHeight} /></Screen>
  );
}

/** Glass language for screens that manage their own scrolling and chrome. */
export function BentoCanvas({ children, style, backdropHeight = 1800 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; backdropHeight?: number }) {
  const { palette } = useApp();
  return (
    <View style={[{ flex: 1, backgroundColor: palette.background }, style]}><GlassBackdrop height={backdropHeight} /></View>
  );
}

/** Grouped block inside the grid. Auto-height, roomier padding. */
export function BentoPanel({ children, tone = 'glass', onPress, accessibilityLabel, style, contentStyle }: { children: React.ReactNode; tone?: BentoTone; onPress?: () => void; accessibilityLabel?: string; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <BentoTile tone={tone} onPress={onPress} accessibilityLabel={accessibilityLabel} contentStyle={[{ padding: 16, gap: 12 }, contentStyle]}>
      {children}
    </BentoTile>
  );
}

/** Icon + label + caption action cell. */
export function BentoAction({ icon, label, caption, onPress, flex = 1, height }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; caption?: string; onPress: () => void; flex?: number; height?: number }) {
  const { palette } = useApp();
  const reduceTransparency = useReduceTransparency();
  return (
    <BentoTile onPress={onPress} accessibilityLabel={label} flex={flex} height={height} contentStyle={{ gap: 10, justifyContent: 'space-between' }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: reduceTransparency ? palette.surfaceAlt : palette.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
          borderWidth: 1,
          borderColor: palette.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.92)',
        }}
      >
        <Ionicons name={icon} size={18} color={palette.primary} />
      </View>
      <View style={{ gap: 2 }}>
        <AppText variant="label" numberOfLines={2}>{label}</AppText>
        {caption ? (
          <AppText variant="micro" color={palette.muted} numberOfLines={1}>
            {caption}
          </AppText>
        ) : null}
      </View>
    </BentoTile>
  );
}

/** Soft colour wash behind the grid. */
export function GlassBackdrop({ height = 1500 }: { height?: number }) {
  const { palette } = useApp();
  const reduceTransparency = useReduceTransparency();
  if (reduceTransparency) return null;

  const strong = palette.isDark ? '4A' : '5C';
  const medium = palette.isDark ? '38' : '4A';
  const soft = palette.isDark ? '2E' : '42';

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: -150, left: -140, right: -140, height }}>
      <LinearGradient colors={[`${palette.primary}${strong}`, `${palette.primary}00`]} start={{ x: 0.15, y: 0.1 }} end={{ x: 0.9, y: 0.95 }} style={{ position: 'absolute', top: 0, right: -30, width: 340, height: 340, borderRadius: 170 }} />
      <LinearGradient colors={[`${palette.secondary}${medium}`, `${palette.secondary}00`]} start={{ x: 0.2, y: 0.2 }} end={{ x: 0.9, y: 0.9 }} style={{ position: 'absolute', top: 300, left: -60, width: 300, height: 300, borderRadius: 150 }} />
      <LinearGradient colors={[`${palette.gold}${soft}`, `${palette.gold}00`]} start={{ x: 0.4, y: 0.1 }} end={{ x: 0.8, y: 0.95 }} style={{ position: 'absolute', top: 620, right: -80, width: 280, height: 280, borderRadius: 140 }} />
      <LinearGradient colors={[`${palette.secondary}${soft}`, `${palette.secondary}00`]} start={{ x: 0.2, y: 0.2 }} end={{ x: 0.9, y: 0.9 }} style={{ position: 'absolute', top: 1040, left: -80, width: 300, height: 300, borderRadius: 150 }} />
      {height > 1600 && (
        <>
          <LinearGradient colors={[`${palette.primary}${medium}`, `${palette.primary}00`]} start={{ x: 0.1, y: 0.1 }} end={{ x: 0.9, y: 0.9 }} style={{ position: 'absolute', top: 1440, right: -90, width: 320, height: 320, borderRadius: 160 }} />
          <LinearGradient colors={[`${palette.gold}${soft}`, `${palette.gold}00`]} start={{ x: 0.3, y: 0.2 }} end={{ x: 0.9, y: 0.9 }} style={{ position: 'absolute', top: 1840, left: -70, width: 300, height: 300, borderRadius: 150 }} />
        </>
      )}
    </View>
  );
}