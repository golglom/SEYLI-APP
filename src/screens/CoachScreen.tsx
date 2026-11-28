import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useRef } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { EMERGENCY_NUMBERS, SUPPORT_CENTERS } from '../data/static';
import { dial, triggerSos } from '../lib/emergency';
import { coachReply } from '../lib/gemini';
import { useNav } from '../navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store';
import { radius, space } from '../theme';
import { AppText, Badge, BentoScreen, BentoPanel, BentoGrid, BentoRow, BentoColumn, BentoTile, BentoAction, BentoCanvas, BentoChip, BentoBtn } from '../ui/bento';
import { COACH_MODES, CoachMessage, CoachMode } from '../types';

const QUICK_PROMPTS = [
  'Je reçois des messages menaçants, que faire ?',
  'Comment signaler un compte sur TikTok ?',
  'On diffuse mes photos sans mon accord.',
  'Je n’ose pas en parler à mes parents.',
];

function localReply(message: string): string {
  const text = message.toLowerCase();
  if (/suicide|mourir|tuer|danger/.test(text)) {
    return [
      'Ta sécurité passe avant tout. Si tu es en danger immédiat, appelle Allô 1011 (gratuit 24h/24), la Police (117) ou la Gendarmerie (172).',
      '',
      'Éloigne-toi de la personne si possible et préviens un adulte de confiance tout de suite. Tu n’es pas seule.',
    ].join('\n');
  }
  if (/photo|image|intime|chantage|sextorsion/.test(text)) {
    return [
      'Ce que tu vis s’appelle du chantage (sextorsion) et c’est interdit par la loi togolaise n° 2018-026.',
      '',
      '1. Ne paie pas et ne réponds pas.',
      '2. Fais des captures de la conversation sans supprimer le compte.',
      '3. Archive-les dans le Coffre SEYLI.',
      '4. Signale à l’ANCy Togo (+228 97 52 58 58) et parle à un adulte de confiance.',
    ].join('\n');
  }
  if (/signal|block|bloque|tiktok|instagram|whatsapp|facebook|snap/.test(text)) {
    return [
      'Pour signaler proprement :',
      '',
      '• Ouvre le profil concerné, menu « … » → Signaler → Harcèlement.',
      '• Bloque le compte juste après le signalement.',
      '• Ne supprime pas la conversation : elle sert de preuve.',
      '• Garde les captures d’écran datées dans ton Coffre.',
      '',
      'Tu peux aussi appeler le 3018 ou Allô 1011 pour être guidée pas à pas.',
    ].join('\n');
  }
  return [
    'Merci de me partager cela. Ce que tu ressens est légitime, et tu n’es jamais responsable de ce que l’autre fait.',
    '',
    'Pour t’aider concrètement : décris-moi ce qui s’est passé (plateforme, message, depuis quand). Je te proposerai des étapes simples.',
    '',
    'En cas d’urgence : Allô 1011 (24h/24) • 3018 • Police 117.',
  ].join('\n');
}

export default function CoachScreen() {
  const { palette, state, addContact, deleteContact } = useApp();
  const nav = useNav();
  const aiReady = state.geminiKey.trim().length > 0;
  const insets = useSafeAreaInsets();
  const tabClearance = Math.max(12, insets.bottom + 6) + 91;
  const [subTab, setSubTab] = useState<'coach' | 'help' | 'quick'>('quick');
  const [mode, setMode] = useState<CoachMode>('FAST');
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: 'welcome',
      fromUser: false,
      text: 'Bonjour. Tu es au bon endroit, et tu n’es pas seule. Prends ton temps pour m’expliquer ce qui se passe : un message reçu, des moqueries en groupe, un chantage… Je suis là pour t’aider pas à pas.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<any>(null);

  const [contactName, setContactName] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(timer);
  }, [messages, subTab]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    const userMessage: CoachMessage = { id: `u_${Date.now()}`, fromUser: true, text: content };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);
    try {
      const reply = aiReady
        ? await coachReply(mode, messages.map((m) => ({ fromUser: m.fromUser, text: m.text })), content)
        : localReply(content);
      setMessages((prev) => [...prev, { id: `c_${Date.now()}`, fromUser: false, text: reply }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Le coach est indisponible.';
      console.warn('[SEYLI coach] réponse en ligne indisponible :', message);
      setMessages((prev) => [
        ...prev,
        { id: `e_${Date.now()}`, fromUser: false, text: `Voici une réponse préparée sur ton téléphone :\n\n${localReply(content)}` },
      ]);
    } finally {
      setSending(false);
    }
  };

  const addNewContact = () => {
    const ok = addContact(contactName, contactRelation, contactPhone);
    if (!ok) {
      Alert.alert('Champs incomplets', 'Renseigne un nom, une relation et un numéro valide.');
      return;
    }
    setContactName('');
    setContactRelation('');
    setContactPhone('');
  };

  useEffect(() => {
    // Simple fade-in animation for new messages
    const handler = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Trigger entrance animation
        }
      },
      { threshold: 0.1 }
    );
    return () => handler.disconnect();
  }, []);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BentoCanvas>
        <BentoRow style={{ gap: 8, paddingHorizontal: space.xl, paddingBottom: 12 }}>
          <BentoChip label="Coach IA" active={subTab === 'coach'} onPress={() => setSubTab('coach')} icon="sparkles-outline" />
          <BentoChip label="Aide" active={subTab === 'help'} onPress={() => setSubTab('help')} icon="call-outline" />
          <BentoChip label="Rapide" active={subTab === 'quick'} onPress={() => setSubTab('quick')} icon="flash" />
        </BentoRow>

        {subTab === 'coach' ? (
          <View style={{ flex: 1 }}>
            <BentoRow style={{ gap: 8, paddingHorizontal: space.xl, paddingBottom: 12 }}>
              {COACH_MODES.map((m) => (
                <BentoChip key={m.key} label={m.label} active={mode === m.key} onPress={() => setMode(m.key)} />
              ))}
            </BentoRow>

            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: space.xl, paddingTop: 4, gap: 12, paddingBottom: 12 }}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((message) =>
                message.fromUser ? (
                  <BentoTile
                    style={{
                      alignSelf: 'flex-end',
                      maxWidth: '88%',
                      backgroundColor: palette.primary,
                      borderRadius: radius.lg,
                      borderBottomRightRadius: radius.sm,
                      padding: 16,
                      paddingVertical: 12,
                    }}
                  >
                    <AppText variant="body" color={palette.onPrimary}>{message.text}</AppText>
                  </BentoTile>
                ) : (
                  <BentoTile
                    style={{ alignSelf: 'flex-start', maxWidth: '88%', borderBottomLeftRadius: radius.sm }}
                    contentStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
                  >
                    <AppText variant="body">{message.text}</AppText>
                  </BentoTile>
                )
              )}
              {sending ? (
                <BentoTile style={{ alignSelf: 'flex-start', borderBottomLeftRadius: radius.sm }} contentStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                  <AppText variant="caption" color={palette.muted}>Coach SEYLI écrit…</AppText>
                </BentoTile>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {QUICK_PROMPTS.map((prompt) => (
                  <BentoTile
                    key={prompt}
                    onPress={() => send(prompt)}
                    accessibilityLabel={prompt}
                    style={{ borderRadius: radius.pill }}
                    contentStyle={{ paddingHorizontal: 14, paddingVertical: 10 }}
                  >
                    <AppText variant="caption" color={palette.muted}>{prompt}</AppText>
                  </BentoTile>
                ))}
              </View>
              {!aiReady ? (
                <View>
                  <AppText variant="caption" color={palette.muted} style={{ margin: 16 }}>
                    Mode local : les réponses sont préparées sur ton téléphone, sans connexion.
                    Connecte ta clé Gemini pour discuter avec le Coach en ligne.
                  </AppText>
                  <BentoAction icon="key-outline" label="Connecter ma clé API" onPress={() => nav.navigate('apikey')} />
                </View>
              ) : null}
            </ScrollView>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: space.xl,
                paddingTop: 12,
                paddingBottom: tabClearance,
                borderTopWidth: 1,
                borderTopColor: palette.hairline,
                backgroundColor: 'transparent',
              }}
            >
              <AppText variant="body" color={palette.text}>Écris à Coach SEYLI…</AppText>
              <Pressable onPress={() => send()} disabled={!input.trim() || sending} accessibilityRole="button" accessibilityLabel="Envoyer le message" style={{ width: 50, height: 50, borderRadius: 25, opacity: !input.trim() ? 0.5 : 1, transform: [{ scale: !input.trim() ? 0.96 : 1 }], shadowColor: palette.primaryDeep, shadowOpacity: input.trim() ? 0.3 : 0, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: input.trim() ? 4 : 0 }}>
                <LinearGradient
                  colors={input.trim() ? [palette.primary, palette.primaryDeep] : [palette.surfaceAlt, palette.surfaceAlt]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="arrow-up" size={20} color={input.trim() ? palette.onPrimary : palette.muted} />
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        ) : subTab === 'help' ? (
          <View>
            <BentoScreen>
              <BentoPanel style={{ gap: 10 }}>
                <AppText variant="h3">Numéros d'urgence</AppText>
                {EMERGENCY_NUMBERS.map((n) => (
                  <Pressable key={n.number} onPress={() => dial(n.number)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 }}>
                    <Ionicons name="call" size={38} tone="error" />
                    <View style={{ flex: 1 }}>
                      <AppText variant="label">{n.label} · {n.number}</AppText>
                      <AppText variant="caption" color={palette.muted}>{n.description}</AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={palette.muted} />
                  </Pressable>
                ))}
              </BentoPanel>

              <BentoPanel style={{ gap: 10 }}>
                <AppText variant="h3">Structures d'aide</AppText>
                {SUPPORT_CENTERS.slice(0, 4).map((center) => (
                  <View key={center.id} style={{ gap: 2 }}>
                    <AppText variant="label">{center.name}</AppText>
                    <AppText variant="caption" color={palette.muted}>{center.description}</AppText>
                  </View>
                ))}
                <BentoBtn label="Voir tous les lieux" variant="secondary" icon="location-outline" onPress={() => nav.goTab('map')} />
              </BentoPanel>

              <BentoBtn label="Ouvrir le guide d'action" icon="compass-outline" onPress={() => nav.navigate('guide')} />
            </BentoScreen>
          </View>
        ) : subTab === 'quick' ? (
          <BentoGrid gap={12}>
            {['signalement', 'urgence', 'conseils', 'contacts'].map((category, i) => (
              <BentoRow key={category}>
                <BentoTile
                  style={{ borderRadius: radius.lg, overflow: 'hidden', backgroundColor: palette.isDark ? 'rgba(31,24,38,0.8)' : 'rgba(255,255,255,0.7)' }}
                  onPress={() => Alert.alert(`Category: ${category}`)}
                >
                  <View style={{ padding: 20, gap: 12 }}>
                    <Ionicons name={category === 'signalement' ? 'flag-outline' : category === 'urgence' ? 'alert-circle' : category === 'conseils' ? 'information-circle-outline' : 'people-outline'} size={24} color={palette.primary} />
                    <AppText variant="h3" style={{ fontSize: 18 }}>{category.charAt(0).toUpperCase() + category.slice(1)}</AppText>
                    <AppText variant="bodySm" color={palette.muted}>
                      Actions rapides pour {category}
                    </AppText>
                  </View>
                </BentoTile>
              </BentoRow>
            ))}
          </BentoGrid>
        ) : null}
      </BentoCanvas>
    </KeyboardAvoidingView>
  );
}