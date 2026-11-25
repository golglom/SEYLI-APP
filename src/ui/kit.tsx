import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { StyleProp, TextInputProps, TextStyle, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNav } from '../navigation';
import { useApp } from '../store';
import { radius, space, type } from '../theme';
import { Glass } from './glass';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export function AppText({
  variant = 'body',
  color,
  style,
  children,
  numberOfLines,
}: {
  variant?: keyof typeof type;
  color?: string;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
  numberOfLines?: number;
}) {
  const { palette } = useApp();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[type[variant], { color: color ?? palette.text }, style]}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  tone = 'surface',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'surface' | 'alt' | 'primary';
}) {
  const { palette } = useApp();
  const background =
    tone === 'alt' ? palette.surfaceAlt : tone === 'primary' ? palette.primaryContainer : palette.surface;
  return (
    <View
      style={[
        {
          backgroundColor: background,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: palette.hairline,
          padding: 20,
          shadowColor: palette.glow,
          shadowOpacity: palette.isDark ? 0.4 : 0.05,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Btn({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  loading,
  style,
  compact,
}: {
  label: string;
  onPress: () => void;
  icon?: IoniconName;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const { palette } = useApp();
  const colors = {
    primary: { fg: palette.onPrimary, gradient: [palette.primary, palette.primaryDeep] as const },
    secondary: { fg: palette.onPrimaryContainer, gradient: [palette.primaryContainer, palette.primaryContainer] as const },
    ghost: { fg: palette.text, gradient: ['transparent', 'transparent'] as const },
    danger: { fg: '#FFFFFF', gradient: ['#E5344F', '#A81B36'] as const },
    gold: { fg: '#3A2400', gradient: ['#FFD798', '#F2B45C'] as const },
  }[variant];
  const filled = variant === 'primary' || variant === 'danger' || variant === 'gold';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: filled ? '#FFFFFF2E' : palette.primary + '1A', borderless: false }}
      style={({ pressed }) => [
        {
          minHeight: compact ? 44 : 54,
          paddingHorizontal: compact ? 16 : 20,
          borderRadius: radius.pill,
          overflow: 'hidden',
          borderWidth: filled ? 0 : 1,
          borderColor: variant === 'secondary' ? palette.hairline : palette.outline,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          ...(filled
            ? {
                shadowColor: variant === 'gold' ? '#8A5A12' : palette.primaryDeep,
                shadowOpacity: disabled ? 0 : 0.32,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 7 },
                elevation: 4,
              }
            : {}),
        },
        style,
      ]}
    >
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />
      {filled ? (
        <LinearGradient
          pointerEvents="none"
          colors={['#FFFFFF33', '#FFFFFF00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '58%' }}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator size="small" color={colors.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={compact ? 16 : 18} color={colors.fg} /> : null}
          <Text style={[type.label, { color: colors.fg, letterSpacing: 0.2 }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: IoniconName;
}) {
  const { palette } = useApp();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 9,
          paddingHorizontal: 14,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: active ? 'transparent' : palette.hairline,
          backgroundColor: active ? palette.primary : palette.surfaceAlt,
          opacity: pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={14} color={active ? palette.onPrimary : palette.muted} />
      ) : null}
      <Text style={[type.chip, { color: active ? palette.onPrimary : palette.muted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.pill,
        backgroundColor: color + '18',
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={[type.micro, { color, letterSpacing: 0.3 }]}>{label}</Text>
    </View>
  );
}

/** One shared shape for every leading icon: 38–76px, rounded generously, tinted. */
export function IconTile({
  name,
  size = 38,
  tone = 'primary',
  color,
}: {
  name: IoniconName;
  size?: number;
  tone?: 'primary' | 'error' | 'neutral' | 'accent';
  color?: string;
}) {
  const { palette } = useApp();
  const tones = {
    primary: { background: palette.primaryContainer, foreground: palette.primary },
    error: { background: palette.errorContainer, foreground: palette.error },
    neutral: { background: palette.surfaceAlt, foreground: palette.muted },
    accent: { background: palette.secondaryContainer, foreground: palette.secondary },
  }[tone];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.34),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tones.background,
      }}
    >
      <Ionicons name={name} size={Math.round(size * 0.47)} color={color ?? tones.foreground} />
    </View>
  );
}

/** Inline contextual message: same padding, radius and filet everywhere. */
export function Note({
  children,
  icon = 'information-circle-outline',
  tone = 'neutral',
}: {
  children: React.ReactNode;
  icon?: IoniconName;
  tone?: 'neutral' | 'error';
}) {
  const { palette } = useApp();
  const isError = tone === 'error';
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 10,
        padding: 12,
        borderRadius: radius.md,
        borderWidth: 1,
        backgroundColor: isError ? palette.errorContainer : palette.surfaceAlt,
        borderColor: isError ? palette.error + '33' : palette.hairline,
      }}
    >
      <Ionicons
        name={icon}
        size={17}
        color={isError ? palette.error : palette.tertiary}
        style={{ marginTop: 1 }}
      />
      <Text style={[type.caption, { flex: 1, color: isError ? palette.error : palette.muted }]}>
        {children}
      </Text>
    </View>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  const { palette } = useApp();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <AppText variant="h3">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color={palette.muted} style={{ marginTop: 4 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <Text style={[type.label, { color: palette.primary, fontSize: 14 }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Field({
  label,
  hint,
  style,
  ...props
}: Omit<TextInputProps, 'style'> & { label?: string; hint?: string; style?: StyleProp<ViewStyle> }) {
  const { palette } = useApp();
  return (
    <View style={[{ gap: 7 }, style]}>
      {label ? (
        <Text style={[type.micro, { color: palette.muted }]}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={palette.muted}
        selectionColor={palette.primary}
        {...props}
        style={[
          type.body,
          {
            color: palette.text,
            backgroundColor: palette.surfaceAlt,
            borderWidth: 1,
            borderColor: palette.hairline,
            borderRadius: radius.md,
            paddingHorizontal: 16,
            paddingVertical: 14,
            minHeight: props.multiline ? 112 : 54,
            textAlignVertical: props.multiline ? 'top' : 'center',
          },
        ]}
      />
      {hint ? (
        <Text style={[type.caption, { color: palette.muted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function IconButton({
  name,
  onPress,
  color,
  size = 20,
  accessibilityLabel,
}: {
  name: IoniconName;
  onPress: () => void;
  color?: string;
  size?: number;
  accessibilityLabel: string;
}) {
  const { palette } = useApp();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.surfaceAlt,
        opacity: pressed ? 0.65 : 1,
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Ionicons name={name} size={size} color={color ?? palette.text} />
    </Pressable>
  );
}

export function Screen({
  children,
  scroll = true,
  contentStyle,
  bottomInset = 118,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  bottomInset?: number;
}) {
  const { palette } = useApp();
  const { isRoot } = useNav();
  const insets = useSafeAreaInsets();
  const content = (
    <View
      style={[
        {
          paddingHorizontal: space.xl,
          paddingTop: space.lg,
          paddingBottom: (isRoot ? bottomInset : 32) + insets.bottom,
          gap: 22,
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );
  if (!scroll) {
    return <View style={{ flex: 1, backgroundColor: palette.background }}>{content}</View>;
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  );
}

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const { palette } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.scrim, justifyContent: 'flex-end' }}>
        <Glass
          blur={false}
          tintColor={palette.background + 'F5'}
          style={{
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            borderWidth: 1,
            borderColor: palette.hairline,
            maxHeight: '92%',
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: palette.outline }} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: space.xl,
              paddingVertical: space.lg,
            }}
          >
            <AppText variant="h3">{title}</AppText>
            <IconButton name="close" onPress={onClose} accessibilityLabel="Fermer" size={19} />
          </View>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: 40 + insets.bottom, gap: space.lg }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Glass>
      </View>
    </Modal>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IoniconName;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const { palette } = useApp();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
      <LinearGradient
        colors={[palette.primary, palette.primaryDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 68,
          height: 68,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: palette.primaryDeep,
          shadowOpacity: 0.32,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
        }}
      >
        <Ionicons name={icon} size={30} color={palette.onPrimary} />
      </LinearGradient>
      <AppText variant="title" style={{ textAlign: 'center', marginTop: 4 }}>
        {title}
      </AppText>
      <AppText variant="bodySm" color={palette.muted} style={{ textAlign: 'center', maxWidth: 300 }}>
        {body}
      </AppText>
      {action ? <View style={{ marginTop: 4 }}>{action}</View> : null}
    </View>
  );
}

export function Stat({
  value,
  label,
  color,
  labelColor,
}: {
  value: string;
  label: string;
  color?: string;
  labelColor?: string;
}) {
  const { palette } = useApp();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={[type.h2, { color: color ?? palette.text }]}>{value}</Text>
      <Text style={[type.micro, { color: labelColor ?? palette.muted, letterSpacing: 0.5 }]}>{label}</Text>
    </View>
  );
}

export function Divider() {
  const { palette } = useApp();
  return <View style={{ height: 1, backgroundColor: palette.hairline }} />;
}

export function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  icon: IoniconName;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  const { palette } = useApp();
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          backgroundColor: palette.primaryContainer,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={18} color={palette.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="label">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color={palette.muted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View
        style={{
          width: 52,
          height: 32,
          borderRadius: 16,
          padding: 4,
          backgroundColor: value ? palette.primary : palette.outline,
          alignItems: value ? 'flex-end' : 'flex-start',
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}
        />
      </View>
    </Pressable>
  );
}
