import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import { getPalette, Palette, ThemeMode } from './theme';
import {
  Evidence,
  MoodCheckin,
  MoodType,
  SavedPlace,
  SafetyZone,
  SmsMessage,
  SupportCenter,
  TrustedContact,
  ZoneCheckInRecord,
} from './types';

const STORAGE_KEY = 'seyli.expo.state.v1';

export interface AppState {
  sessionActive: boolean;
  alias: string;
  sessionId: string;
  themeMode: ThemeMode;
  maskDeviceInfo: boolean;
  hidePreviews: boolean;
  biometricLock: boolean;
  pinSalt: string | null;
  pinHash: string | null;
  incognitoScreenshots: boolean;
  guideDone: string[];
  smsAutoFilter: boolean;
  monitoring: boolean;
  evidences: Evidence[];
  contacts: TrustedContact[];
  moods: MoodCheckin[];
  places: SavedPlace[];
  sms: SmsMessage[];
  zones: SafetyZone[];
  checkIns: ZoneCheckInRecord[];
}

/**
 * expo-crypto is loaded on demand: on Android, Expo Go 58 fails to register native
 * modules when a project is opened after another one in the same session
 * (expo/expo#54020), which crashed the app at startup with
 * "Cannot find native module 'ExpoCrypto'" because of a top-level import.
 */
async function hashPin(pin: string, salt: string): Promise<string> {
  const Crypto = await import('expo-crypto');
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

const rand = (prefix = '') =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;

function newSessionId(): string {
  const hex = Array.from({ length: 8 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');
  return `TG-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

const initialState: AppState = {
  sessionActive: false,
  alias: 'Anonyme',
  sessionId: newSessionId(),
  themeMode: 'system',
  maskDeviceInfo: false,
  hidePreviews: false,
  biometricLock: true,
  pinSalt: null,
  pinHash: null,
  incognitoScreenshots: false,
  guideDone: [],
  smsAutoFilter: false,
  monitoring: false,
  evidences: [],
  contacts: [],
  moods: [],
  places: [],
  sms: [],
  zones: [],
  checkIns: [],
};

interface AppContextValue {
  state: AppState;
  ready: boolean;
  palette: Palette;
  set: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  patch: (partial: Partial<AppState>) => void;
  startSession: () => void;
  endSession: () => void;
  addEvidence: (input: Omit<Evidence, 'id' | 'createdAt' | 'updatedAt'>) => Evidence;
  updateEvidence: (id: string, partial: Partial<Evidence>) => void;
  deleteEvidence: (id: string) => void;
  addContact: (name: string, relation: string, phone: string) => boolean;
  deleteContact: (id: string) => void;
  addMood: (mood: MoodType, note?: string) => void;
  addPlace: (center: SupportCenter) => void;
  deletePlace: (id: string) => void;
  addSms: (message: Omit<SmsMessage, 'id' | 'receivedAt'>) => SmsMessage;
  updateSms: (id: string, partial: Partial<SmsMessage>) => void;
  deleteSms: (id: string) => void;
  upsertZone: (zone: Omit<SafetyZone, 'id' | 'createdAt'> & { id?: string }) => void;
  toggleZone: (id: string, enabled: boolean) => void;
  deleteZone: (id: string) => void;
  addCheckIn: (record: Omit<ZoneCheckInRecord, 'id' | 'timestamp'>) => void;
  toggleGuideStep: (id: string) => void;
  savePin: (pin: string) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
  clearPin: () => void;
  clearAll: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const scheme = useColorScheme();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AppState>;
          setState({ ...initialState, ...parsed });
        }
      } catch {
        // Corrupted store: start fresh.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }, 250);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, ready]);

  const palette = useMemo(
    () => getPalette(state.themeMode, scheme === 'dark'),
    [state.themeMode, scheme]
  );

  const set = useCallback(<K extends keyof AppState>(key: K, value: AppState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const patch = useCallback((partial: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const startSession = useCallback(() => {
    setState((prev) => ({ ...prev, sessionActive: true }));
  }, []);

  const endSession = useCallback(() => {
    setState((prev) => ({ ...prev, sessionActive: false }));
  }, []);

  const addEvidence = useCallback((input: Omit<Evidence, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const item: Evidence = { ...input, id: rand('ev_'), createdAt: now, updatedAt: now };
    setState((prev) => ({ ...prev, evidences: [item, ...prev.evidences] }));
    return item;
  }, []);

  const updateEvidence = useCallback((id: string, partial: Partial<Evidence>) => {
    setState((prev) => ({
      ...prev,
      evidences: prev.evidences.map((ev) =>
        ev.id === id ? { ...ev, ...partial, updatedAt: Date.now() } : ev
      ),
    }));
  }, []);

  const deleteEvidence = useCallback((id: string) => {
    setState((prev) => ({ ...prev, evidences: prev.evidences.filter((ev) => ev.id !== id) }));
  }, []);

  const addContact = useCallback((name: string, relation: string, phone: string) => {
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (!cleanName || !relation.trim() || cleanPhone.length < 3) return false;
    const contact: TrustedContact = {
      id: rand('ct_'),
      name: cleanName.slice(0, 80),
      relation: relation.trim().slice(0, 50),
      phone: cleanPhone.slice(0, 30),
      createdAt: Date.now(),
    };
    setState((prev) => ({
      ...prev,
      contacts: [...prev.contacts, contact].sort((a, b) => a.name.localeCompare(b.name)),
    }));
    return true;
  }, []);

  const deleteContact = useCallback((id: string) => {
    setState((prev) => ({ ...prev, contacts: prev.contacts.filter((c) => c.id !== id) }));
  }, []);

  const addMood = useCallback((mood: MoodType, note?: string) => {
    const checkin: MoodCheckin = { id: rand('md_'), mood, note, createdAt: Date.now() };
    setState((prev) => ({ ...prev, moods: [checkin, ...prev.moods] }));
  }, []);

  const addPlace = useCallback((center: SupportCenter) => {
    const place: SavedPlace = {
      id: center.id,
      name: center.name,
      category: center.category,
      address: center.address,
      city: center.city,
      phone: center.phone,
      latitude: center.latitude,
      longitude: center.longitude,
      createdAt: Date.now(),
    };
    setState((prev) => ({
      ...prev,
      places: [place, ...prev.places.filter((p) => p.id !== place.id)],
    }));
  }, []);

  const deletePlace = useCallback((id: string) => {
    setState((prev) => ({ ...prev, places: prev.places.filter((p) => p.id !== id) }));
  }, []);

  const addSms = useCallback((message: Omit<SmsMessage, 'id' | 'receivedAt'>) => {
    const item: SmsMessage = { ...message, id: rand('sms_'), receivedAt: Date.now() };
    setState((prev) => ({ ...prev, sms: [item, ...prev.sms] }));
    return item;
  }, []);

  const updateSms = useCallback((id: string, partial: Partial<SmsMessage>) => {
    setState((prev) => ({
      ...prev,
      sms: prev.sms.map((m) => (m.id === id ? { ...m, ...partial } : m)),
    }));
  }, []);

  const deleteSms = useCallback((id: string) => {
    setState((prev) => ({ ...prev, sms: prev.sms.filter((m) => m.id !== id) }));
  }, []);

  const upsertZone = useCallback(
    (zone: Omit<SafetyZone, 'id' | 'createdAt'> & { id?: string }) => {
      const item: SafetyZone = {
        ...zone,
        id: zone.id ?? rand('zn_'),
        createdAt: Date.now(),
      };
      setState((prev) => {
        const existing = prev.zones.find((z) => z.id === item.id);
        const merged = existing ? { ...existing, ...item, createdAt: existing.createdAt } : item;
        return {
          ...prev,
          zones: [merged, ...prev.zones.filter((z) => z.id !== item.id)],
        };
      });
    },
    []
  );

  const toggleZone = useCallback((id: string, enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      zones: prev.zones.map((z) => (z.id === id ? { ...z, enabled } : z)),
    }));
  }, []);

  const deleteZone = useCallback((id: string) => {
    setState((prev) => ({ ...prev, zones: prev.zones.filter((z) => z.id !== id) }));
  }, []);

  const addCheckIn = useCallback((record: Omit<ZoneCheckInRecord, 'id' | 'timestamp'>) => {
    const item: ZoneCheckInRecord = { ...record, id: rand('ci_'), timestamp: Date.now() };
    setState((prev) => ({ ...prev, checkIns: [item, ...prev.checkIns].slice(0, 60) }));
  }, []);

  const toggleGuideStep = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      guideDone: prev.guideDone.includes(id)
        ? prev.guideDone.filter((s) => s !== id)
        : [...prev.guideDone, id],
    }));
  }, []);

  const savePin = useCallback(async (pin: string) => {
    if (!/^\d{4,8}$/.test(pin.trim())) return false;
    const salt = rand('');
    const hash = await hashPin(pin.trim(), salt);
    setState((prev) => ({ ...prev, pinSalt: salt, pinHash: hash }));
    return true;
  }, []);

  const verifyPin = useCallback(
    async (pin: string) => {
      if (!state.pinSalt || !state.pinHash) return false;
      const hash = await hashPin(pin.trim(), state.pinSalt);
      return hash === state.pinHash;
    },
    [state.pinSalt, state.pinHash]
  );

  const clearPin = useCallback(() => {
    setState((prev) => ({ ...prev, pinSalt: null, pinHash: null }));
  }, []);

  const clearAll = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setState({ ...initialState, sessionId: newSessionId() });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      ready,
      palette,
      set,
      patch,
      startSession,
      endSession,
      addEvidence,
      updateEvidence,
      deleteEvidence,
      addContact,
      deleteContact,
      addMood,
      addPlace,
      deletePlace,
      addSms,
      updateSms,
      deleteSms,
      upsertZone,
      toggleZone,
      deleteZone,
      addCheckIn,
      toggleGuideStep,
      savePin,
      verifyPin,
      clearPin,
      clearAll,
    }),
    [
      state,
      ready,
      palette,
      set,
      patch,
      startSession,
      endSession,
      addEvidence,
      updateEvidence,
      deleteEvidence,
      addContact,
      deleteContact,
      addMood,
      addPlace,
      deletePlace,
      addSms,
      updateSms,
      deleteSms,
      upsertZone,
      toggleZone,
      deleteZone,
      addCheckIn,
      toggleGuideStep,
      savePin,
      verifyPin,
      clearPin,
      clearAll,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
