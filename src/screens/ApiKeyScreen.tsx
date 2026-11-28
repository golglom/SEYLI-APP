import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { verifyGeminiKey } from '../lib/gemini';
import { useApp } from '../store';
import { radius } from '../theme';
import { AppText, BentoScreen, BentoPanel, BentoGrid, BentoRow, BentoBtn, BentoBadge } from '../ui/bento';

const AI_STUDIO_URL = 'https://aistudio.google.com/apikey';

function maskKey(key: string) {
  if (key.length <= 10) return `${key.slice(0, 2)}…`;
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

export default function ApiKeyScreen() {
  const { palette, state, set } = useApp();
  const savedKey = state.geminiKey.trim();
  const [draft, setDraft] = useState(savedKey);
  const [reveal, setReveal] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const changeDraft = (value: string) => {
    setDraft(value);
    if (status) setStatus(null);
  };

  const pasteKey = async () => {
    try {
      const Clipboard = await import('expo-clipboard');
      const value = await Clipboard.getStringAsync();
      const clean = (value ?? '').trim();
      if (!clean) {
        Alert.alert('Presse-papiers vide', 'Copie d\'abord ta clé depuis Google AI Studio.');
        return;
      }
      changeDraft(clean);
    } catch {
      Alert.alert('Collage impossible', 'Colle la clé à la main dans le champ.');
    }
  };

  const testKey = async () => {
    const key = (draft.trim() || savedKey).trim();
    if (!key) {
      Alert.alert('Aucune clé', 'Colle ta clé API Gemini avant de la tester.');
      return;
    }
    setTesting(true);
    setStatus(null);
    try {
      const result = await verifyGeminiKey(key);
      setStatus(
        result.ok
          ? { ok: true, message: 'Clé valide : Google a répondu correctement.' }
          : { ok: false, message: result.message }
      );
    } finally {
      setTesting(false);
    }
  };

  const saveKey = () => {
    const clean = draft.trim();
    if (clean.length < 20) {
      Alert.alert(
        'Clé incomplète',
        'Une clé Gemini fait une trentaine de caractères. Copie-la en entier depuis Google AI Studio.'
      );
      return;
    }
    set('geminiKey', clean);
    setStatus({ ok: true, message: 'Clé enregistrée sur ce téléphone.' });
    Alert.alert(
      'Clé enregistrée',
      'SEYLI utilisera ta clé pour l\'analyse des messages et le Coach. Tu peux la supprimer à tout moment.'
    );
  };

  const removeKey = () => {
    Alert.alert(
      'Supprimer la clé ?',
      'Les analyses repasseront en mode local sur ce téléphone. Ta clé Google reste active : pense à la révoquer dans Google AI Studio.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            set('geminiKey', '');
            setDraft('');
            setStatus(null);
          },
        },
      ]
    );
  };

  return (
    <BentoScreen>
      <BentoPanel tone="glass" style={{ gap: 12 }}>
        <BentoRow style={{ alignItems: 'center', gap: 12 }}>
          <View style={{
            width: 44, height: 44, borderRadius: radius.md,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: palette.surfaceAlt, borderWidth: 1, borderColor: palette.hairline
          }}>
            <Ionicons name="key-outline" size={20} color={palette.primary} />
          </View>
          <BentoGrid style={{ gap: 2 }}>
            <BentoRow>
              <AppText variant="title">Ta clé API Gemini</AppText>
              <AppText variant="caption" color={palette.muted}>Chaque personne connecte la sienne. Elle reste sur ce téléphone.</AppText>
            </BentoRow>
            <BentoRow>
              <AppText variant="caption" color={palette.muted}>Pas d'email, pas de compte.</AppText>
            </BentoRow>
          </BentoGrid>
          <BentoBadge label={savedKey ? 'CONNECTÉE' : 'LOCAL'} color={savedKey ? palette.severity.LOW : palette.muted} />
        </BentoRow>
      </BentoPanel>

      <BentoPanel style={{ borderColor: palette.hairline, marginTop: 8 }}>
        <AppText variant="micro" color={palette.muted}>COMMENT FAIRE</AppText>
        {['Ouvre Google AI Studio et connecte-toi avec ton compte Google.', 'Crée une clé API Gemini (l\'usage de base est gratuit).', 'Copie la clé, colle-la ci-dessous, teste-la puis enregistrent.'].map((line, index) => (
          <View key={line} style={{ flexDirection: 'row', gap: 8 }}>
            <AppText variant="bodySm" color={palette.primary}>{index + 1}.</AppText>
            <AppText variant="caption" color={palette.muted} style={{ flex: 1 }}>{line}</AppText>
          </View>
        ))}

        <BentoRow style={{ gap: 8, marginTop: 12 }}>
          <BentoBtn label="Ouvrir Google AI Studio" icon="open-outline" variant="secondary" compact onPress={() => {
            Linking.openURL(AI_STUDIO_URL).catch(() => Alert.alert('Lien indisponible', AI_STUDIO_URL));
          }} />
          {savedKey ? (
            <BentoBtn label="Supprimer la clé" variant="danger" compact onPress={removeKey} />
          ) : null}
        </BentoRow>
      </BentoPanel>

      {status ? (
        <BentoPanel style={{ padding: 12, borderRadius: radius.md, backgroundColor: palette.surfaceAlt, borderColor: status.ok ? palette.severity.LOW : palette.error, marginTop: 8 }}>
          <AppText variant="title" color={status.ok ? palette.severity.LOW : palette.error}>{status.ok ? 'Clé valide' : 'Clé invalide'}</AppText>
          <AppText variant="caption" color={palette.muted}>{status.message}</AppText>
        </BentoPanel>
      ) : null}

      {!savedKey ? (
        <BentoPanel style={{ gap: 8, marginTop: 8 }}>
          <AppText variant="micro" color={palette.muted}>COMMENT FAIRE</AppText>
          {['Ouvre Google AI Studio et connecte-toi avec ton compte Google.', 'Crée une clé API Gemini (l\'usage de base est gratuit).', 'Copie la clé, colle-la ci-dessous, teste-la puis enregistrent.'].map((line, index) => (
            <View key={line} style={{ flexDirection: 'row', gap: 8 }}>
              <AppText variant="bodySm" color={palette.primary}>{index + 1}.</AppText>
              <AppText variant="caption" color={palette.muted} style={{ flex: 1 }}>{line}</AppText>
            </View>
          ))}
        </BentoPanel>
      ) : null}
    </BentoScreen>
  );
}