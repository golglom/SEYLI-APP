import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { EMERGENCY_NUMBERS, SUPPORT_CENTERS } from '../data/static';
import { dial, sendSmsOrCompose } from '../lib/emergency';
import { coachReply, geminiEnabled } from '../lib/gemini';
import { useNav } from '../navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store';
import { radius, space, type } from '../theme';
import { AppText, Badge, Btn, Card, Chip, Field, IconTile, Note, Screen, SectionTitle } from '../ui/kit';
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
  const insets = useSafeAreaInsets();
  const tabClearance = Math.max(12, insets.bottom + 6) + 91;
  const [subTab, setSubTab] = useState<'coach' | 'help' | 'circle'>('coach');
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
  const scrollRef = useRef<ScrollViewInstance>(null);

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
      const reply = geminiEnabled
        ? await coachReply(
            mode,
            messages.map((m) => ({ fromUser: m.fromUser, text: m.text })),
            content
          )
        : localReply(content);
      setMessages((prev) => [...prev, { id: `c_${Date.now()}`, fromUser: false, text: reply }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Le coach est indisponible.';
      setMessages((prev) => [
        ...prev,
        {
          id: `e_${Date.now()}`,
          fromUser: false,
          text: `Je n’ai pas pu joindre l’IA (${message}). Voici une réponse locale :\n\n${localReply(content)}`,
        },
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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: space.xl, paddingBottom: 12 }}>
          <Chip label="Coach IA" active={subTab === 'coach'} onPress={() => setSubTab('coach')} icon="sparkles-outline" />
          <Chip label="Aide" active={subTab === 'help'} onPress={() => setSubTab('help')} icon="call-outline" />
          <Chip label="Cercle" active={subTab === 'circle'} onPress={() => setSubTab('circle')} icon="people-outline" />
        </View>

        {subTab === 'coach' ? (
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: space.xl, paddingBottom: 12 }}>
              {COACH_MODES.map((m) => (
                <Chip key={m.key} label={m.label} active={mode === m.key} onPress={() => setMode(m.key)} />
              ))}
            </View>
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: space.xl, paddingTop: 4, gap: 12, paddingBottom: tabClearance }}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((message) =>
                message.fromUser ? (
                  <LinearGradient
                    key={message.id}
                    colors={[palette.primary, palette.primaryDeep]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      alignSelf: 'flex-end',
                      maxWidth: '88%',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: radius.lg,
                      borderBottomRightRadius: radius.sm,
                      shadowColor: palette.primaryDeep,
                      shadowOpacity: 0.26,
                      shadowRadius: 14,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 3,
                    }}
                  >
                    <AppText variant="body" color={palette.onPrimary}>
                      {message.text}
                    </AppText>
                  </LinearGradient>
                ) : (
                  <View
                    key={message.id}
                    style={{
                      alignSelf: 'flex-start',
                      maxWidth: '88%',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: radius.lg,
                      borderBottomLeftRadius: radius.sm,
                      backgroundColor: palette.surface,
                      borderWidth: 1,
                      borderColor: palette.hairline,
                      shadowColor: palette.glow,
                      shadowOpacity: palette.isDark ? 0.35 : 0.05,
                      shadowRadius: 16,
                      shadowOffset: { width: 0, height: 8 },
                      elevation: 2,
                    }}
                  >
                    <AppText variant="body">{message.text}</AppText>
                  </View>
                )
              )}
              {sending ? (
                <View
                  style={{
                    alignSelf: 'flex-start',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: radius.lg,
                    borderBottomLeftRadius: radius.sm,
                    backgroundColor: palette.surfaceAlt,
                    borderWidth: 1,
                    borderColor: palette.hairline,
                  }}
                >
                  <AppText variant="caption" color={palette.muted}>
                    Coach SEYLI écrit…
                  </AppText>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {QUICK_PROMPTS.map((prompt) => (
                  <Pressable
                    key={prompt}
                    onPress={() => send(prompt)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: radius.pill,
                      backgroundColor: palette.surface,
                      borderWidth: 1,
                      borderColor: palette.hairline,
                      opacity: pressed ? 0.8 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    })}
                  >
                    <AppText variant="caption" color={palette.muted}>
                      {prompt}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              {!geminiEnabled ? (
                <Note icon="sparkles-outline">
                  Mode local : ajoute une clé Gemini dans `.env` pour des réponses IA.
                </Note>
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
                backgroundColor: palette.background,
              }}
            >
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Écris à Coach SEYLI…"
                placeholderTextColor={palette.muted}
                multiline
                maxLength={1200}
                style={[
                  type.body,
                  {
                    flex: 1,
                    maxHeight: 112,
                    minHeight: 50,
                    color: palette.text,
                    backgroundColor: palette.surface,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: palette.hairline,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  },
                ]}
              />
              <Pressable
                onPress={() => send()}
                disabled={!input.trim() || sending}
                accessibilityRole="button"
                accessibilityLabel="Envoyer le message"
                style={({ pressed }) => ({
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  overflow: 'hidden',
                  opacity: !input.trim() ? 0.5 : pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                  shadowColor: palette.primaryDeep,
                  shadowOpacity: input.trim() ? 0.3 : 0,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: input.trim() ? 4 : 0,
                })}
              >
                <LinearGradient
                  colors={
                    input.trim()
                      ? [palette.primary, palette.primaryDeep]
                      : [palette.surfaceAlt, palette.surfaceAlt]
                  }
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
          <Screen>
            <Card style={{ gap: 10 }}>
              <SectionTitle title="Numéros d’urgence" subtitle="Gratuits et confidentiels au Togo." />
              {EMERGENCY_NUMBERS.map((n) => (
                <Pressable
                  key={n.number}
                  onPress={() => dial(n.number)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 }}
                >
                  <IconTile name="call" size={38} tone="error" />
                  <View style={{ flex: 1 }}>
                    <AppText variant="label">
                      {n.label} · {n.number}
                    </AppText>
                    <AppText variant="caption" color={palette.muted}>
                      {n.description}
                    </AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={palette.muted} />
                </Pressable>
              ))}
            </Card>

            <Card style={{ gap: 10 }}>
              <SectionTitle title="Structures d’aide" subtitle="Orientation locale" />
              {SUPPORT_CENTERS.slice(0, 4).map((center) => (
                <View key={center.id} style={{ gap: 2 }}>
                  <AppText variant="label">{center.name}</AppText>
                  <AppText variant="caption" color={palette.muted}>
                    {center.description}
                  </AppText>
                </View>
              ))}
              <Btn label="Voir tous les lieux" variant="secondary" icon="location-outline" onPress={() => nav.goTab('map')} />
            </Card>

            <Btn label="Ouvrir le guide d’action" icon="compass-outline" onPress={() => nav.navigate('guide')} />
          </Screen>
        ) : (
          <Screen>
            <Card style={{ gap: 12 }}>
              <SectionTitle
                title="Cercle de confiance"
                subtitle="Ces proches reçoivent ton SOS avec ta position."
              />
              {state.contacts.length === 0 ? (
                <AppText variant="caption" color={palette.muted}>
                  Ajoute au moins un proche pour activer le SOS 1 clic.
                </AppText>
              ) : (
                state.contacts.map((contact) => (
                  <View key={contact.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: palette.primaryContainer,
                      }}
                    >
                      <AppText variant="label" color={palette.primary}>
                        {contact.name.slice(0, 1).toUpperCase()}
                      </AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="label">{contact.name}</AppText>
                      <AppText variant="caption" color={palette.muted}>
                        {contact.relation} · {contact.phone}
                      </AppText>
                    </View>
                    <Pressable
                      onPress={() => {
                            void sendSmsOrCompose(
                              [contact.phone],
                              'SEYLI — message test de mon cercle de confiance.'
                            );
                          }}
                      hitSlop={8}
                      accessibilityLabel={`Envoyer un SMS à ${contact.name}`}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={19} color={palette.primary} />
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        Alert.alert('Retirer ce contact ?', contact.name, [
                          { text: 'Annuler', style: 'cancel' },
                          { text: 'Retirer', style: 'destructive', onPress: () => deleteContact(contact.id) },
                        ])
                      }
                      hitSlop={8}
                      accessibilityLabel={`Supprimer ${contact.name}`}
                    >
                      <Ionicons name="trash-outline" size={18} color={palette.muted} />
                    </Pressable>
                  </View>
                ))
              )}
            </Card>

            <Card style={{ gap: 10 }}>
              <SectionTitle title="Ajouter un proche" />
              <Field label="NOM" value={contactName} onChangeText={setContactName} maxLength={80} placeholder="Ex. Maman" />
              <Field
                label="RELATION"
                value={contactRelation}
                onChangeText={setContactRelation}
                maxLength={50}
                placeholder="Parent, ami(e), enseignant…"
              />
              <Field
                label="TÉLÉPHONE"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
                maxLength={30}
                placeholder="+228…"
              />
              <Btn label="Ajouter au cercle" icon="person-add-outline" onPress={addNewContact} />
            </Card>

            <Card tone="alt" style={{ gap: 6 }}>
              <Badge label="SOS vérifié" color={palette.severity.LOW} />
              <AppText variant="caption" color={palette.muted}>
                Le SOS 1 clic ouvre ton application SMS avec un message prêt et ta position, puis compose le 3018.
                Dans Expo Go, l’envoi reste manuel (aucune interception SMS native).
              </AppText>
            </Card>
          </Screen>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
