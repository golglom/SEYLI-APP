import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { EMERGENCY_NUMBERS, GUIDE_STEPS } from '../data/static';
import { dial } from '../lib/emergency';
import { useNav } from '../navigation';
import { useApp } from '../store';
import { radius, type ThemeMode } from '../theme';
import { AppText, Badge, Chip, Divider, IconTile, SectionTitle } from '../ui/kit';
import { BentoPanel, BentoScreen } from '../ui/bento';

function Row({
  icon,
  title,
  subtitle,
  onPress,
  danger,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { palette } = useApp();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 11,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <IconTile name={icon} size={38} tone={danger ? 'error' : 'primary'} />
      <View style={{ flex: 1 }}>
        <AppText variant="label" color={danger ? palette.error : palette.text}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={palette.muted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={palette.muted} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { palette, state, set, endSession, clearAll } = useApp();
  const nav = useNav();

  const themeOptions: { key: ThemeMode; label: string }[] = [
    { key: 'system', label: 'Auto' },
    { key: 'light', label: 'Clair' },
    { key: 'dark', label: 'Sombre' },
  ];

  return (
    <BentoScreen>
      <BentoPanel contentStyle={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <LinearGradient
            colors={[palette.primary, palette.primaryDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 54,
              height: 54,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: palette.primaryDeep,
              shadowOpacity: 0.28,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 7 },
              elevation: 4,
            }}
          >
            <AppText variant="h3" color={palette.onPrimary}>
              {state.alias.slice(0, 1).toUpperCase()}
            </AppText>
          </LinearGradient>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="title">{state.alias}</AppText>
            <AppText variant="mono" color={palette.muted}>
              {state.sessionId}
            </AppText>
          </View>
          <Badge label="LOCAL" color={palette.severity.LOW} />
        </View>
        <Divider />
        <AppText variant="micro" color={palette.muted}>
          APPARENCE
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {themeOptions.map((option) => (
            <Chip
              key={option.key}
              label={option.label}
              active={state.themeMode === option.key}
              onPress={() => set('themeMode', option.key)}
            />
          ))}
        </View>
      </BentoPanel>

      <BentoPanel contentStyle={{ gap: 6 }}>
        <SectionTitle title="Configuration" />
        <Row
          icon="key-outline"
          title="Clé API IA"
          subtitle={
            state.geminiKey.trim()
              ? 'Connectée — analyses Gemini avec ta propre clé'
              : 'Non connectée — analyse locale uniquement'
          }
          onPress={() => nav.navigate('apikey')}
        />
        <Row
          icon="shield-half-outline"
          title="Confidentialité"
          subtitle="Pseudonyme, code, aperçus sensibles"
          onPress={() => nav.navigate('privacy')}
        />
        <Row
          icon="compass-outline"
          title="Guide d’action immédiate"
          subtitle={`${state.guideDone.length}/${GUIDE_STEPS.length} étapes complétées`}
          onPress={() => nav.navigate('guide')}
        />
        <Row
          icon="navigate-outline"
          title="Zones de sécurité"
          subtitle={`${state.zones.length} zone(s) configurée(s)`}
          onPress={() => nav.navigate('zones')}
        />
        <Row
          icon="chatbox-ellipses-outline"
          title="Filtre SMS"
          subtitle={`${state.sms.length} message(s) analysé(s)`}
          onPress={() => nav.navigate('sms')}
        />
        <Row
          icon="bar-chart-outline"
          title="Rapport mensuel"
          subtitle="Tendances, plateformes, auteurs"
          onPress={() => nav.navigate('insight')}
        />
      </BentoPanel>

      <BentoPanel contentStyle={{ gap: 10 }}>
        <SectionTitle title="Tes données locales" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Badge label={`${state.evidences.length} preuves`} color={palette.primary} />
          <Badge label={`${state.contacts.length} proches`} color={palette.secondary} />
          <Badge label={`${state.moods.length} humeurs`} color={palette.tertiary} />
          <Badge label={`${state.places.length} lieux`} color={palette.muted} />
          <Badge label={`${state.zones.length} zones`} color={palette.severity.LOW} />
        </View>
        <AppText variant="caption" color={palette.muted}>
          Tout est stocké sur cet appareil. Aucun compte, aucun serveur SEYLI.
        </AppText>
      </BentoPanel>

      <BentoPanel contentStyle={{ gap: 8 }}>
        <SectionTitle title="Urgences Togo" />
        {EMERGENCY_NUMBERS.slice(0, 4).map((item) => (
          <Pressable
            key={item.number}
            onPress={() => dial(item.number)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 }}
          >
            <Ionicons name="call-outline" size={16} color={palette.primary} />
            <AppText variant="caption" style={{ flex: 1 }}>
              {item.label}
            </AppText>
            <AppText variant="micro" color={palette.muted}>
              {item.number}
            </AppText>
          </Pressable>
                  ))}
      </BentoPanel>

      <BentoPanel contentStyle={{ gap: 4 }}>
        <SectionTitle title="Session & données" />
        <Row
          icon="log-out-outline"
          title="Changer de session"
          subtitle="Revenir à l’écran de démarrage"
          onPress={() =>
            Alert.alert('Changer de session ?', 'Tes données locales resteront enregistrées.', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Continuer', onPress: endSession },
            ])
          }
        />
        <Row
          icon="trash-outline"
          title="Effacer toutes les données"
          subtitle="Preuves, contacts, zones, messages…"
          danger
          onPress={() =>
            Alert.alert(
              'Tout effacer ?',
              'Cette action supprime définitivement tes preuves, contacts, humeurs, lieux, SMS et zones de cet appareil.',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Tout effacer',
                  style: 'destructive',
                  onPress: async () => {
                    await clearAll();
                  },
                },
              ]
            )
          }
        />
      </BentoPanel>

      <BentoPanel tone="soft" contentStyle={{ gap: 8 }}>
        <AppText variant="label">SEYLI · Secure Your Life · Togo</AppText>
        <AppText variant="caption" color={palette.muted}>
          Version 1.0.6 — application Android signée. Le suivi de position s’arrête quand tu fermes
          l’application ; les preuves restent sur ton téléphone.
        </AppText>
        <AppText variant="caption" color={palette.muted}>
          Allô 1011 (gratuit 24h/24) • 3018 • ANCy +228 97 52 58 58
        </AppText>
      </BentoPanel>
    </BentoScreen>
  );
}
