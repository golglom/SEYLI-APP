import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';
import { EMERGENCY_NUMBERS, GUIDE_STEPS } from '../data/static';
import { dial } from '../lib/emergency';
import { useApp } from '../store';
import { radius } from '../theme';
import { AppText, BentoScreen, BentoPanel, BentoGrid, BentoRow, BentoAction, BentoTile } from '../ui/bento';

export default function GuideScreen() {
  const { palette, state, toggleGuideStep, set } = useApp();
  const progress = state.guideDone.length / GUIDE_STEPS.length;

  return (
    <BentoScreen>
      <BentoPanel tone="glass" style={{ gap: 12 }}>
        <AppText variant="h3">Guide d’action immédiate</AppText>
        <AppText variant="caption" color={palette.muted}>
          Des étapes simples, dans l’ordre, pour reprendre le contrôle.
        </AppText>
      </BentoPanel>

      <View style={{ height: 8, borderRadius: 4, backgroundColor: palette.surfaceAlt, overflow: 'hidden' }}>
        <View
          style={{
            width: Math.round(progress * 100) + '%',
            height: '100%',
            backgroundColor: palette.primary,
          }}
        />
      </View>

      <BentoRow style={{ marginTop: 12 }}>
        <AppText variant="micro" color={palette.muted}>
          {state.guideDone.length}/{GUIDE_STEPS.length} ÉTAPES
        </AppText>
        <BentoAction
          icon="refresh"
          label="RÉINITIALISER"
          onPress={() => set('guideDone', [])}
        />
      </BentoRow>

      <BentoGrid gap={12}>
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
              <BentoPanel style={{ gap: 8, borderColor: done ? palette.severity.LOW + '88' : palette.outline }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? palette.severity.LOW : palette.primaryContainer }}>
                  {done ? (
                    <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                  ) : (
                    <AppText variant="micro" color={palette.primary}>{index + 1}</AppText>
                  )}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="subtitle" style={{ textDecorationLine: done ? 'line-through' : undefined, opacity: done ? 0.75 : undefined }}>
                    {step.title}
                  </AppText>
                  <AppText variant="bodySm" color={palette.muted}>{step.body}</AppText>
                </View>
              </BentoPanel>
            </Pressable>
          );
        })}
      </BentoGrid>

      <BentoPanel tone="alt" style={{ gap: 10 }}>
        <AppText variant="label">Besoin d'aide maintenant ?</AppText>
        <AppText variant="caption" color={palette.muted}>
          Appels gratuits et confidentiels.
        </AppText>
      </BentoPanel>

      <BentoRow style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
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
            <AppText variant="micro">{item.label} · {item.number}</AppText>
          </Pressable>
        ))}
      </BentoRow>

      <BentoAction icon="call" label="Appeler Allô 1011" onPress={() => dial('1011')} />

      <BentoPanel style={{ gap: 8 }}>
        <AppText variant="label">À retenir</AppText>
        <AppText variant="bodySm" color={palette.muted}>
          Le harcèlement n’est jamais ta faute. Tu as le droit de te protéger, de conserver les preuves et de demander de l’aide. Parle à une personne de confiance dès que possible.
        </AppText>
      </BentoPanel>
    </BentoScreen>
  );
}