import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';
import {
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import {
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, AppState, BackHandler, Easing, Platform, Pressable, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/store';
import { NavContext, ROUTE_TITLES, type Nav, type Route, type TabKey } from './src/navigation';
import { radius, space, type } from './src/theme';
import { AppText, IconButton } from './src/ui/kit';
import { Glass } from './src/ui/glass';
import { haptic, setHapticsEnabled } from './src/lib/native';
import { setSecureScreen } from './modules/seyli-sms/src';
import { useReduceMotion } from './src/lib/a11y';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import AnalyzerScreen from './src/screens/AnalyzerScreen';
import VaultScreen from './src/screens/VaultScreen';
import CoachScreen from './src/screens/CoachScreen';
import MapScreen from './src/screens/MapScreen';
import SmsFilterScreen from './src/screens/SmsFilterScreen';
import SafetyZonesScreen from './src/screens/SafetyZonesScreen';
import InsightScreen from './src/screens/InsightScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PrivacyScreen from './src/screens/PrivacyScreen';
import ApiKeyScreen from './src/screens/ApiKeyScreen';
import GuideScreen from './src/screens/GuideScreen';

const TABS: { key: TabKey; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'home', label: 'Accueil', icon: 'home' },
  { key: 'analyzer', label: 'Analyser', icon: 'sparkles' },
  { key: 'vault', label: 'Preuves', icon: 'lock-closed' },
  { key: 'coach', label: 'Coach', icon: 'chatbubbles' },
  { key: 'map', label: 'Lieux', icon: 'location' },
];

function Splash() {
  const { palette } = useApp();
  return (
    <View style={{ flex: 1, backgroundColor: palette.background, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <LinearGradient
        colors={[palette.primary, palette.primaryDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 84,
          height: 84,
          borderRadius: 30,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: palette.primaryDeep,
          shadowOpacity: 0.4,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 8,
        }}
      >
        <Ionicons name="shield-checkmark" size={38} color={palette.onPrimary} />
      </LinearGradient>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <AppText variant="display" style={{ letterSpacing: 5 }}>
          SEYLI
        </AppText>
        <AppText variant="mono" color={palette.muted}>
          SECURE YOUR LIFE · TOGO
        </AppText>
      </View>
      <ActivityIndicator color={palette.primary} style={{ marginTop: 6 }} />
    </View>
  );
}

function ScreenForRoute({ route }: { route: Route }) {
  switch (route) {
    case 'home':
      return <HomeScreen />;
    case 'analyzer':
      return <AnalyzerScreen />;
    case 'vault':
      return <VaultScreen />;
    case 'coach':
      return <CoachScreen />;
    case 'map':
      return <MapScreen />;
    case 'sms':
      return <SmsFilterScreen />;
    case 'zones':
      return <SafetyZonesScreen />;
    case 'insight':
      return <InsightScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'privacy':
      return <PrivacyScreen />;
    case 'apikey':
      return <ApiKeyScreen />;
    case 'guide':
      return <GuideScreen />;
    default:
      return <HomeScreen />;
  }
}

function TabButton({
  item,
  active,
  onPress,
  reduceMotion,
}: {
  item: (typeof TABS)[number];
  active: boolean;
  onPress: () => void;
  reduceMotion: boolean;
}) {
  const { palette } = useApp();
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(active ? 1 : 0);
      return;
    }
    Animated.spring(anim, {
      toValue: active ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 7,
    }).start();
  }, [active, anim, reduceMotion]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -1] });

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', paddingVertical: 4, gap: 3 }}
    >
      <Animated.View
        style={{
          width: 46,
          height: 32,
          borderRadius: 16,
          overflow: 'hidden',
          transform: [{ scale }, { translateY }],
          ...(active
            ? {
                shadowColor: palette.primaryDeep,
                shadowOpacity: 0.35,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 5 },
                elevation: 3,
              }
            : {}),
        }}
      >
        {active ? (
          <LinearGradient
            colors={[palette.primary, palette.primaryDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name={item.icon} size={19} color={palette.onPrimary} />
          </LinearGradient>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons
              name={`${item.icon}-outline` as typeof item.icon}
              size={20}
              color={palette.muted}
            />
          </View>
        )}
      </Animated.View>
      <AppText
        variant="micro"
        style={{ letterSpacing: 0.1, fontSize: 10 }}
        color={active ? palette.primary : palette.muted}
      >
        {item.label}
      </AppText>
    </Pressable>
  );
}

function Shell() {
  const { palette, set } = useApp();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>('home');
  const [history, setHistory] = useState<Route[]>([]);
  const route: Route = history.length ? history[history.length - 1] : tab;

  const goTab = useCallback((next: TabKey) => {
    void haptic('selection');
    setTab(next);
    setHistory([]);
  }, []);

  const navigate = useCallback((next: Route) => {
    setHistory((prev) => [...prev, next]);
  }, []);

  const back = useCallback(() => {
    setHistory((prev) => prev.slice(0, -1));
  }, []);

  const reduceMotion = useReduceMotion();

  // Every route change settles in instead of snapping: 10px lift, short fade.
  // With "reduce motion" on, the new screen appears at once.
  const transition = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduceMotion) {
      transition.setValue(1);
      return;
    }
    transition.setValue(0);
    Animated.timing(transition, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [route, reduceMotion, transition]);

  // Android hardware back follows the in-app stack before letting the system exit.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (history.length > 0) {
        back();
        return true;
      }
      if (tab !== 'home') {
        goTab('home');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [history.length, tab, back, goTab]);

  const isRoot = history.length === 0;
  const nav = useMemo<Nav>(
    () => ({ route, isRoot, goTab, navigate, back }),
    [route, isRoot, goTab, navigate, back]
  );
  const title = ROUTE_TITLES[route];

  const toggleTheme = () => set('themeMode', palette.isDark ? 'light' : 'dark');

  return (
    <NavContext.Provider value={nav}>
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <View
          style={{
            paddingHorizontal: space.xl,
            paddingTop: 6,
            paddingBottom: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {!isRoot ? (
            <>
              <IconButton name="arrow-back" onPress={back} accessibilityLabel="Retour" size={20} />
              <AppText variant="h3" numberOfLines={1} style={{ flex: 1 }}>
                {title}
              </AppText>
            </>
          ) : (
            <>
              <LinearGradient
                colors={[palette.primary, palette.primaryDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: palette.primaryDeep,
                  shadowOpacity: 0.32,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 4,
                }}
              >
                <Ionicons name="shield" size={21} color={palette.onPrimary} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <AppText style={{ ...type.h3, letterSpacing: 2.5 }} numberOfLines={1}>
                  SEYLI
                </AppText>
                <AppText variant="mono" color={palette.muted} style={{ marginTop: 1 }}>
                  SECURE YOUR LIFE · TOGO
                </AppText>
              </View>
            </>
          )}
          <IconButton
            name={palette.isDark ? 'sunny-outline' : 'moon-outline'}
            onPress={toggleTheme}
            accessibilityLabel="Changer de thème"
            size={18}
          />
          <IconButton
            name="settings-outline"
            onPress={() => navigate('settings')}
            accessibilityLabel="Ouvrir les réglages"
            size={18}
          />
        </View>

        <Animated.View
          style={{
            flex: 1,
            opacity: transition,
            transform: [
              { translateY: transition.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
            ],
          }}
        >
          <ScreenForRoute route={route} />
        </Animated.View>

        {isRoot ? (
          <>
            <LinearGradient
              pointerEvents="none"
              colors={[palette.background + '00', palette.background]}
              style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 }}
            />
            <View
              style={{
                position: 'absolute',
                left: 14,
                right: 14,
                bottom: Math.max(10, insets.bottom + 4),
                borderRadius: 30,
                shadowColor: palette.glow,
                shadowOpacity: palette.isDark ? 0.6 : 0.16,
                shadowRadius: 28,
                shadowOffset: { width: 0, height: 16 },
                elevation: 16,
              }}
            >
              <Glass
                style={{
                  borderRadius: 30,
                  borderWidth: 1,
                  borderColor: palette.hairline,
                  flexDirection: 'row',
                  paddingVertical: 7,
                  paddingHorizontal: 6,
                }}
              >
                {TABS.map((item) => (
                  <TabButton
                    key={item.key}
                    item={item}
                    active={tab === item.key}
                    onPress={() => goTab(item.key)}
                    reduceMotion={reduceMotion}
                  />
                ))}
              </Glass>
            </View>
          </>
        ) : null}
      </View>
    </NavContext.Provider>
  );
}

function Root() {
  const { palette, ready, state } = useApp();
  const reduceMotion = useReduceMotion();

  // No system haptics preference exists in React Native: decorative taps follow
  // the OS motion setting so a reduced-motion user gets a calmer app.
  useEffect(() => {
    setHapticsEnabled(!reduceMotion);
  }, [reduceMotion]);

  // Le blocage des captures est une préférence persistée : il doit être
  // réappliqué à chaque démarrage, pas seulement au moment du réglage. Le
  // drapeau appartient à la fenêtre Android : une activité recréée repart sans
  // lui, d'où le rappel à chaque retour au premier plan.
  useEffect(() => {
    if (!ready) return;
    setSecureScreen(state.incognitoScreenshots);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') setSecureScreen(state.incognitoScreenshots);
    });
    return () => sub.remove();
  }, [ready, state.incognitoScreenshots]);

  if (!ready) return <Splash />;
  return (
    <>
      <StatusBar style={palette.isDark ? 'light' : 'dark'} />
      {state.sessionActive ? <Shell /> : <AuthScreen />}
    </>
  );
}

// Prevent the splash from auto-hiding so we control exactly when it goes away.
// Must be called at module level before any component renders.
SplashScreen.preventAutoHideAsync().catch((err) => {
  console.warn('SplashScreen.preventAutoHideAsync failed:', err);
});

function ThemedSafeArea({ children }: { children: React.ReactNode }) {
  const { palette } = useApp();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.background }}
      edges={['top', 'left', 'right']}
    >
      {children}
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_600SemiBold,
    Outfit_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    JetBrainsMono_500Medium,
  });

  // A font asset must never hold the app on the launch screen: after a few
  // seconds the UI renders with whatever fonts are available.
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFontTimeout(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  const ready = fontsLoaded || !!fontError || fontTimeout;

  useEffect(() => {
    // Hide the splash screen once the app is ready (fonts loaded or timeout reached)
    // Also ensure it hides after a hard timeout of 5 seconds as a safety net
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('SplashScreen.hideAsync failed:', e);
      }
    };

    // Immediate hide if ready, otherwise wait for font timeout
    if (ready) {
      hideSplash();
    }

    // Fallback: always hide after 5 seconds even if fonts aren't loaded
    const fallbackTimer = setTimeout(hideSplash, 5000);
    return () => clearTimeout(fallbackTimer);
  }, [ready]);

  if (!ready) {
    // During initial load, render null so the splash screen stays visible
    // and we maintain control over when to hide it.
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <ThemedSafeArea>
          <Root />
        </ThemedSafeArea>
      </AppProvider>
    </SafeAreaProvider>
  );
}
