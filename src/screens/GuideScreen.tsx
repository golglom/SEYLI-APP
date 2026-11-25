import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';
import { EMERGENCY_NUMBERS, GUIDE_STEPS } from '../data/static';
import { dial } from '../lib/emergency';
import { useApp } from '../store';
import { radius } from '../theme';
import { AppText, Btn, Card, Screen, SectionTitle } from '../ui/kit';

export default function GuideScreen() {
  const { palette, state, toggleGuideStep, set } = useApp();
  const progress = state.guideDone.length / GUIDE_STEPS.length;

  return (
    <Screen>
      <Card style={{ gap: 12 }}>
        <SectionTitle
          title="Guide d’action immédiate"
          subtitle="Des étapes simples, dans l’ordre, pour reprendre le contrôle."
        />
        <View style={{ height: 8, borderRadius: 4, backgroundColor: palette.surfaceAlt, overflow: 'hidden' }}>
          <View
            style={{
              width: `${Math.round(progress * 100)}%` as `${number}%`,
              height: '100%',
              backgroundColor: palette.primary,
            }}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="micro" color={palette.muted}>
            {state.guideDone.length}/{GUIDE_STEPS.length} ÉTAPES
          </AppText>
          <Pressable onPress={() => set('guideDone', [])} hitSlop={8}>
            <AppText variant="micro" color={palette.primary}>
              RÉINITIALISER
            </AppText>
          </Pressable>
        </View>
      </Card>

      {GUIDE_STEPS.map((step, index) => {
        const done = state.guideDone.includes(step.id);
        return (
          <Pressable
            key={step.id}
            onPress={() => toggleGuideStep(step.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            accessibilityLabel={step.title}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <Card
              style={{
                gap: 8,
                flexDirection: 'row',
                alignItems: 'flex-start',
                borderColor: done ? palette.severity.LOW + '88' : palette.outline,
              }}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: done ? palette.severity.LOW : palette.primaryContainer,
                }}
              >
                {done ? (
                  <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                ) : (
                  <AppText variant="micro" color={palette.primary}>
                    {index + 1}
                  </AppText>
                )}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText
                  variant="subtitle"
                  style={done ? { textDecorationLine: 'line-through', opacity: 0.75 } : undefined}
                >
                  {step.title}
                </AppText>
                <AppText variant="bodySm" color={palette.muted}>
                  {step.body}
                </AppText>
              </View>
            </Card>
          </Pressable>
        );
      })}

      <Card tone="alt" style={{ gap: 10 }}>
        <SectionTitle title="Besoin d’aide maintenant ?" subtitle="Appels gratuits et confidentiels." />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {EMERGENCY_NUMBERS.map((item) => (
            <Pressable
              key={item.number}
              onPress={() => dial(item.number)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: radius.pill,
                backgroundColor: palette.surface,
                borderWidth: 1,
                borderColor: palette.outline,
              }}
            >
              <Ionicons name="call" size={15} color={palette.primary} />
              <AppText variant="micro">
                {item.label} · {item.number}
              </AppText>
            </Pressable>
          ))}
        </View>
        <Btn label="Appeler Allô 1011" icon="call" onPress={() => dial('1011')} />
      </Card>

      <Card style={{ gap: 8 }}>
        <AppText variant="label">À retenir</AppText>
        <AppText variant="bodySm" color={palette.muted}>
          Le harcèlement n’est jamais ta faute. Tu as le droit de te protéger, de conserver les preuves et de
          demander de l’aide. Parle à une personne de confiance dès que possible.
        </AppText>
      </Card>
    </Screen>
  );
}
