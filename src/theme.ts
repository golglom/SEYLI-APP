export type ThemeMode = 'system' | 'light' | 'dark';

export interface Palette {
  isDark: boolean;
  primary: string;
  primaryDeep: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  tertiary: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  text: string;
  muted: string;
  outline: string;
  hairline: string;
  glow: string;
  scrim: string;
  error: string;
  errorContainer: string;
  heroGradient: readonly [string, string, string];
  gold: string;
  severity: {
    LOW: string;
    MODERATE: string;
    HIGH: string;
    CRITICAL: string;
  };
}

const light: Palette = {
  isDark: false,
  primary: '#D22B6D',
  primaryDeep: '#A41850',
  onPrimary: '#FFFFFF',
  primaryContainer: '#FCE3EE',
  onPrimaryContainer: '#4E0E28',
  secondary: '#6E56F8',
  secondaryContainer: '#ECE7FF',
  tertiary: '#8A6414',
  background: '#FAF6F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F4ECF2',
  surfaceRaised: '#FFFFFF',
  text: '#180F1D',
  muted: '#6E6177',
  outline: '#E7D8E2',
  hairline: '#F0E3EC',
  glow: '#3B0A1F',
  scrim: '#0A0710B8',
  error: '#DC2F4B',
  errorContainer: '#FFE4E9',
  heroGradient: ['#1C0B23', '#4C1243', '#A4275F'],
  gold: '#FFCF8A',
  severity: {
    LOW: '#0FAE7E',
    MODERATE: '#E89B12',
    HIGH: '#EE6A35',
    CRITICAL: '#DC2F4B',
  },
};

const dark: Palette = {
  isDark: true,
  primary: '#FF86B5',
  primaryDeep: '#E4548D',
  onPrimary: '#3B0520',
  primaryContainer: '#3B1129',
  onPrimaryContainer: '#FFD8E6',
  secondary: '#B9A8FF',
  secondaryContainer: '#2A2146',
  tertiary: '#F0C070',
  background: '#0A070E',
  surface: '#141019',
  surfaceAlt: '#1D1724',
  surfaceRaised: '#241C2D',
  text: '#F7F1FA',
  muted: '#A89BB5',
  outline: '#332A3E',
  hairline: '#241D2E',
  glow: '#000000',
  scrim: '#000000CC',
  error: '#FF7A93',
  errorContainer: '#4A1020',
  heroGradient: ['#150A1E', '#37103F', '#7C2054'],
  gold: '#F7CE8B',
  severity: {
    LOW: '#34D399',
    MODERATE: '#FBBF24',
    HIGH: '#FB923C',
    CRITICAL: '#FB7185',
  },
};

export function getPalette(mode: ThemeMode, systemDark: boolean): Palette {
  if (mode === 'dark') return dark;
  if (mode === 'light') return light;
  return systemDark ? dark : light;
}

export const fonts = {
  display: 'Outfit_700Bold',
  displaySemi: 'Outfit_600SemiBold',
  title: 'Outfit_600SemiBold',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemi: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
  mono: 'JetBrainsMono_500Medium',
};

/** Size-specific tracking and leading, tuned for both platforms. */
export const type = {
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.4 },
  h1: { fontFamily: fonts.display, fontSize: 33, lineHeight: 39, letterSpacing: -1 },
  h2: { fontFamily: fonts.display, fontSize: 27, lineHeight: 33, letterSpacing: -0.7 },
  h3: { fontFamily: fonts.display, fontSize: 21, lineHeight: 27, letterSpacing: -0.4 },
  title: { fontFamily: fonts.title, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  subtitle: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 23, letterSpacing: -0.1 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25, letterSpacing: 0.05 },
  bodySm: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 22, letterSpacing: 0.1 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, letterSpacing: 0.1 },
  label: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20, letterSpacing: 0.1 },
  chip: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 17, letterSpacing: 0.1 },
  micro: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 15, letterSpacing: 0.9 },
  mono: { fontFamily: fonts.mono, fontSize: 10.5, lineHeight: 14, letterSpacing: 1.1 },
} as const;

export const radius = { sm: 14, md: 20, lg: 26, xl: 32, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

/** Soft, layered depth: shadows are tinted rather than neutral black. */
export const elevation = {
  card: {
    shadowColor: '#3B0A1F',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#170717',
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
} as const;
