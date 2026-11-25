import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { EMERGENCY_NUMBERS } from '../data/static';
import { dial } from '../lib/emergency';
import { useApp } from '../store';
import { AppText, Btn, Card, Field } from '../ui/kit';
import { radius, space } from '../theme';

export default function AuthScreen() {
  const { palette, state, set, startSession } = useApp();
  const [alias, setAlias] = useState(state.alias === 'Anonyme' ? '' : state.alias);

  const start = () => {
    set('alias', alias.trim().slice(0, 40) || 'Anonyme');
    startSession();
  };

  const features = [
    { icon: 'sparkles-outline' as const, title: 'Analyse IA', body: 'Détecte le harcèlement dans un message ou une capture.' },
    { icon: 'lock-closed-outline' as const, title: 'Coffre de preuves', body: 'Archive et exporte un dossier solide, sans cloud.' },
    { icon: 'people-outline' as const, title: 'Cercle de confiance', body: 'SOS en 1 clic vers tes proches et le 3018.' },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={palette.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: space.xxl,
            paddingTop: 56,
            paddingBottom: 70,
            borderBottomLeftRadius: 36,
            borderBottomRightRadius: 36,
            overflow: 'hidden',
            gap: 16,
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -110,
              right: -80,
              width: 280,
              height: 280,
              borderRadius: 140,
              borderWidth: 1,
              borderColor: '#FFFFFF21',
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -30,
              right: 10,
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: '#FFFFFF12',
            }}
          />

          <LinearGradient
            colors={[palette.primary, palette.primaryDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 54,
              height: 54,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#FFFFFF33',
            }}
          >
            <Ionicons name="shield-checkmark" size={26} color="#FFFFFF" />
          </LinearGradient>

          <AppText variant="mono" color={palette.gold}>
            SEYLI · SECURE YOUR LIFE · TOGO
          </AppText>

          <AppText variant="display" color="#FFFFFF" style={{ marginTop: 2 }}>
            Ta protection,{'\n'}dans ta poche.
          </AppText>

          <AppText variant="bodySm" color="#FFFFFFC9" style={{ maxWidth: 320 }}>
            Un espace privé contre le cyberharcèlement, pensé pour les jeunes filles au Togo.
          </AppText>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            {[
              { icon: 'phone-portrait-outline' as const, label: '100 % local' },
              { icon: 'eye-off-outline' as const, label: 'Sans compte' },
              { icon: 'time-outline' as const, label: '24h/24' },
            ].map((pill) => (
              <View
                key={pill.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: radius.pill,
                  backgroundColor: '#FFFFFF14',
                  borderWidth: 1,
                  borderColor: '#FFFFFF1F',
                }}
              >
                <Ionicons name={pill.icon} size={12} color={palette.gold} />
                <AppText variant="micro" color="#FFFFFF" style={{ letterSpacing: 0.3 }}>
                  {pill.label}
                </AppText>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={{ marginTop: -36, paddingHorizontal: space.xl, gap: 18 }}>
          <Card style={{ gap: 14, padding: 20 }}>
            <View style={{ gap: 4 }}>
              <AppText variant="h3">Commencer sans compte</AppText>
              <AppText variant="caption" color={palette.muted}>
                Choisis un pseudonyme. Toutes tes preuves restent sur ton téléphone, dans un stockage local.
              </AppText>
            </View>
            <Field
              label="TON PSEUDONYME (OPTIONNEL)"
              value={alias}
              onChangeText={setAlias}
              placeholder="Ex. Ama, Anonyme…"
              maxLength={40}
              autoCapitalize="words"
            />
            <Btn label="Continuer avec cet appareil" icon="arrow-forward" onPress={start} />
          </Card>

          <View style={{ gap: 14 }}>
            {features.map((f) => (
              <View key={f.title} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 15,
                    backgroundColor: palette.primaryContainer,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={f.icon} size={19} color={palette.primary} />
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <AppText variant="label">{f.title}</AppText>
                  <AppText variant="caption" color={palette.muted}>
                    {f.body}
                  </AppText>
                </View>
              </View>
            ))}
          </View>

          <View
            style={{
              borderRadius: radius.lg,
              backgroundColor: palette.errorContainer,
              padding: 16,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="call" size={16} color={palette.error} />
              <AppText variant="label" color={palette.error}>
                Urgence immédiate
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {EMERGENCY_NUMBERS.slice(0, 3).map((n) => (
                <Pressable
                  key={n.number}
                  onPress={() => dial(n.number)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: radius.pill,
                    backgroundColor: palette.surface,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <AppText variant="caption" color={palette.text}>
                    {n.label} · {n.number}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <AppText variant="caption" color={palette.muted}>
              Allô 1011 est gratuit et disponible 24h/24 au Togo.
            </AppText>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
