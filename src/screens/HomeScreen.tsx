import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Modal, Pressable, Vibration, View } from 'react-native';
import { EMERGENCY_NUMBERS } from '../data/static';
import { useReduceTransparency } from '../lib/a11y';
import { dial, triggerSos } from '../lib/emergency';
import { useNav } from '../navigation';
import { useApp } from '../store';
import { radius, space } from '../theme';
import { AppText, Btn, SectionTitle, Stat } from '../ui/kit';
import { Glass } from '../ui/glass';
import {
  BentoAction,
  BentoColumn,
  BentoGrid,
  BentoRow,
  BentoScreen,
  BentoTile,
} from '../ui/bento';
import { MOODS, PLATFORMS } from '../types';

function EmergencyChip({
  label,
  number,
}: {
  label: string;
  number: string;
}) {
  const { palette } = useApp();
  return (
    <Pressable
      onPress={() => dial(number)}
      accessibilityRole="button"
      accessibilityLabel={`Appeler ${label}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: radius.pill,
        backgroundColor: palette.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.66)',
        borderWidth: 1,
        borderColor: palette.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.9)',
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Ionicons name="call" size={13} color={palette.primary} />
      <AppText variant="caption" color={palette.text}>
        {label} · {number}
      </AppText>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { palette, state, addMood } = useApp();
  const reduceTransparency = useReduceTransparency();
  const nav = useNav();
  const [moodTip, setMoodTip] = useState<string | null>(null);
  const [panic, setPanic] = useState(false);
  const evidences = state.evidences;
  const reported = evidences.filter((e) => e.status !== 'ARCHIVED').length;
  const firstName = state.alias.split(' ')[0] || 'toi';
  const latest = state.moods[0];

  const onSos = async () => {
    await triggerSos(state.contacts, state.alias);
  };

  const onMood = (mood: (typeof MOODS)[number]) => {
    addMood(mood.key);
    setMoodTip(mood.tip);
    Vibration.vibrate(12);
  };

  const startPanic = () => {
    setPanic(true);
    Vibration.vibrate([0, 600, 250, 600, 250, 900], true);
  };

  const stopPanic = () => {
    Vibration.cancel();
    setPanic(false);
  };

  const glassInner = reduceTransparency
    ? palette.surfaceAlt
    : palette.isDark
      ? 'rgba(255,255,255,0.06)'
      : 'rgba(255,255,255,0.66)';

  return (
    <>
      <BentoScreen>

        <LinearGradient
          colors={palette.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: radius.xl,
            padding: 22,
            gap: 20,
            overflow: 'hidden',
            shadowColor: palette.primaryDeep,
            shadowOpacity: 0.28,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 14 },
            elevation: 6,
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -90,
              right: -70,
              width: 230,
              height: 230,
              borderRadius: 115,
              borderWidth: 1,
              borderColor: '#FFFFFF24',
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -40,
              right: -20,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: '#FFFFFF10',
            }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <AppText variant="mono" color={palette.gold}>
              SEYLI · TOGO
            </AppText>
            <Glass
              appearance="dark"
              intensity={30}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: '#FFFFFF26',
              }}
            >
              <Ionicons name="phone-portrait-outline" size={12} color={palette.gold} />
              <AppText variant="mono" color="#FFFFFF">
                MODE LOCAL
              </AppText>
            </Glass>
          </View>

          <View style={{ gap: 6 }}>
            <AppText variant="h1" color="#FFFFFF">
              Bonjour {firstName}
            </AppText>
            <AppText variant="bodySm" color="#FFFFFFC4">
              Ton espace privé contre le harcèlement. Tout reste sur ton téléphone.
            </AppText>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
            <Stat value={String(evidences.length)} label="PREUVES" color="#FFFFFF" labelColor="#FFFFFFAD" />
            <View style={{ width: 1, height: 34, backgroundColor: '#FFFFFF21' }} />
            <Stat value={String(reported)} label="SIGNALÉES" color={palette.gold} labelColor="#FFFFFFAD" />
            <View style={{ width: 1, height: 34, backgroundColor: '#FFFFFF21' }} />
            <Stat value={String(state.contacts.length)} label="PROCHES SOS" color="#FFFFFF" labelColor="#FFFFFFAD" />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn
              label="Analyser un message"
              icon="sparkles"
              variant="gold"
              onPress={() => nav.navigate('analyzer')}
              style={{ flex: 1 }}
            />
            <Pressable
              onPress={() => nav.goTab('vault')}
              accessibilityRole="button"
              accessibilityLabel="Ouvrir le coffre de preuves"
              style={({ pressed }) => ({
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <Glass
                appearance="dark"
                intensity={34}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#FFFFFF33',
                }}
              >
                <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
              </Glass>
            </Pressable>
          </View>
        </LinearGradient>

        <BentoGrid>
          <BentoRow>
            <BentoTile
              tone="danger"
              height={192}
              style={{ flex: 1.12 }}
              onPress={onSos}
              accessibilityLabel="SOS 3018 en un clic"
              contentStyle={{ justifyContent: 'space-between' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 13,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.24)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.35)',
                  }}
                >
                  <Ionicons name="warning" size={20} color="#FFFFFF" />
                </View>
                <View
                  style={{
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    borderRadius: radius.pill,
                    backgroundColor: 'rgba(255,255,255,0.18)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.32)',
                  }}
                >
                  <AppText variant="micro" color="#FFFFFF">
                    1 CLIC
                  </AppText>
                </View>
              </View>
              <View style={{ gap: 4 }}>
                <AppText variant="title" color="#FFFFFF">
                  SOS 3018
                </AppText>
                <AppText variant="caption" color="#FFFFFFD6">
                  SMS + position à tes proches, puis appel.
                </AppText>
              </View>
            </BentoTile>

            <BentoColumn>
              <BentoTile
                height={91}
                onPress={() => dial('1011')}
                accessibilityLabel="Appeler Allô 1011"
                contentStyle={{ justifyContent: 'center' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                  <Ionicons name="call" size={19} color={palette.primary} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <AppText variant="chip" numberOfLines={1}>
                      Allô 1011
                    </AppText>
                    <AppText variant="micro" color={palette.muted} numberOfLines={1}>
                      Gratuit 24h/24
                    </AppText>
                  </View>
                </View>
              </BentoTile>

              <BentoTile
                height={91}
                onPress={startPanic}
                accessibilityLabel="Alarme panique"
                contentStyle={{ justifyContent: 'center' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                  <Ionicons name="notifications" size={19} color={palette.primary} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <AppText variant="chip" numberOfLines={1}>
                      Alarme panique
                    </AppText>
                    <AppText variant="micro" color={palette.muted} numberOfLines={1}>
                      Vibre fort
                    </AppText>
                  </View>
                </View>
              </BentoTile>
            </BentoColumn>
          </BentoRow>

          <BentoTile tone="soft" contentStyle={{ padding: 16, gap: 14 }}>
            <SectionTitle title="Comment te sens-tu ?" subtitle="Un check-in rapide, sans jugement." />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
              {MOODS.map((mood) => {
                const active = latest?.mood === mood.key;
                return (
                  <Pressable
                    key={mood.key}
                    onPress={() => onMood(mood)}
                    accessibilityRole="button"
                    accessibilityLabel={mood.label}
                    style={({ pressed }) => ({
                      flex: 1,
                      alignItems: 'center',
                      gap: 6,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 23,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: active
                          ? palette.primaryContainer
                          : palette.isDark
                            ? 'rgba(255,255,255,0.07)'
                            : palette.surfaceAlt,
                        borderWidth: active ? 1.5 : 1,
                        borderColor: active
                          ? palette.primary
                          : palette.isDark
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(255,255,255,0.85)',
                      }}
                    >
                      <AppText style={{ fontSize: 21 }}>{mood.emoji}</AppText>
                    </View>
                    <AppText
                      variant="micro"
                      color={active ? palette.primary : palette.muted}
                      style={{ textAlign: 'center', letterSpacing: 0.1, fontSize: 10 }}
                      numberOfLines={2}
                    >
                      {mood.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            {moodTip ? (
              <View
                style={{
                  backgroundColor: glassInner,
                  borderRadius: radius.md,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: palette.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
                }}
              >
                <AppText variant="caption" color={palette.muted}>
                  {moodTip}
                </AppText>
              </View>
            ) : null}
          </BentoTile>
        </BentoGrid>

        <View style={{ gap: 10 }}>
          <SectionTitle title="Actions rapides" subtitle="Tout SEYLI, à portée de pouce." />
          <BentoGrid>
            <BentoRow>
              <BentoAction
                icon="sparkles"
                label="Analyser un message"
                caption="Avec ta clé IA"
                height={126}
                flex={1.35}
                onPress={() => nav.navigate('analyzer')}
              />
              <BentoAction
                icon="shield-checkmark"
                label="Coffre de preuves"
                caption={`${evidences.length} preuve(s)`}
                height={126}
                onPress={() => nav.goTab('vault')}
              />
            </BentoRow>
            <BentoRow>
              <BentoAction
                icon="chatbubbles"
                label="Coach"
                height={104}
                onPress={() => nav.goTab('coach')}
              />
              <BentoAction
                icon="chatbox-ellipses"
                label="Filtre SMS"
                height={104}
                onPress={() => nav.navigate('sms')}
              />
              <BentoAction
                icon="navigate"
                label="Zones"
                height={104}
                onPress={() => nav.navigate('zones')}
              />
            </BentoRow>
            <BentoRow>
              <BentoAction
                icon="bar-chart"
                label="Rapport mensuel"
                height={92}
                onPress={() => nav.navigate('insight')}
              />
              <BentoAction
                icon="compass"
                label="Guide d’action"
                height={92}
                onPress={() => nav.navigate('guide')}
              />
            </BentoRow>
          </BentoGrid>
        </View>

        <BentoTile tone="soft" contentStyle={{ padding: 16, gap: 12 }}>
          <SectionTitle
            title="Dernières preuves"
            subtitle="Ton coffre local, sur cet appareil"
            action="Tout voir"
            onAction={() => nav.goTab('vault')}
          />
          {evidences.slice(0, 2).map((ev) => (
            <Pressable
              key={ev.id}
              onPress={() => nav.goTab('vault')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  backgroundColor: glassInner,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="document-text-outline" size={18} color={palette.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="label" numberOfLines={1}>
                  {ev.title}
                </AppText>
                <AppText variant="micro" color={palette.muted} style={{ letterSpacing: 0.3 }}>
                  {new Date(ev.createdAt).toLocaleDateString('fr-FR')} ·{' '}
                  {PLATFORMS.find((p) => p.key === ev.platform)?.label ?? ev.platform}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={palette.muted} />
            </Pressable>
          ))}
          {evidences.length === 0 ? (
            <AppText variant="caption" color={palette.muted}>
              Aucune preuve archivée pour l’instant. Commence par analyser un message ou une capture.
            </AppText>
          ) : null}
        </BentoTile>

        <View style={{ gap: 10 }}>
          <AppText variant="micro" color={palette.muted}>
            URGENCES AU TOGO
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {EMERGENCY_NUMBERS.map((n) => (
              <EmergencyChip key={n.number} label={n.label} number={n.number} />
            ))}
          </View>
        </View>
      </BentoScreen>

      <Modal visible={panic} animationType="fade" onRequestClose={stopPanic}>
        <LinearGradient
          colors={['#C01535', '#5E0719']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: 18 }}
        >
          <View
            style={{
              width: 92,
              height: 92,
              borderRadius: 34,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF1F',
            }}
          >
            <Ionicons name="warning" size={46} color="#FFFFFF" />
          </View>
          <AppText variant="h1" color="#FFFFFF" style={{ textAlign: 'center' }}>
            ALARME PANIQUE ACTIVE
          </AppText>
          <AppText variant="body" color="#FFFFFFDD" style={{ textAlign: 'center' }}>
            Le téléphone vibre et l’écran clignote pour attirer l’attention autour de toi.
          </AppText>
          <View style={{ width: '100%', gap: 10, marginTop: 12 }}>
            <Btn
              label="Appeler Allô 1011"
              icon="call"
              variant="ghost"
              onPress={() => {
                dial('1011');
              }}
              style={{ backgroundColor: '#FFFFFF' }}
            />
            <Btn label="ARRÊTER L’ALARME" variant="danger" onPress={stopPanic} style={{ backgroundColor: '#00000055' }} />
          </View>
        </LinearGradient>
      </Modal>
    </>
  );
}
