import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { availableMonths, buildMonthlyReport, buildShareableReport } from '../lib/insights';
import { shareText } from '../lib/emergency';
import { useApp } from '../store';
import { radius } from '../theme';
import { AppText, Badge, Btn, BentoScreen, BentoPanel, BentoGrid, BentoRow, BentoChip } from '../ui/bento';
import { MOODS, PLATFORMS } from '../types';

const platformLabel = (key: string) => PLATFORMS.find((p) => p.key === key)?.label ?? key;

export default function InsightScreen() {
  const { palette, state } = useApp();
  const months = useMemo(availableMonths, []);
  const [selected, setSelected] = useState(months[0]);

  const report = useMemo(
    () => buildMonthlyReport(state.evidences, state.sms, state.moods, selected),
    [state.evidences, state.sms, state.moods, selected]
  );

  const history = useMemo(
    () =>
      months
        .slice()
        .reverse()
        .map((month) => ({
          month,
          total: buildMonthlyReport(state.evidences, state.sms, state.moods, month).total,
        })),
    [months, state.evidences, state.sms, state.moods]
  );
  const maxTotal = Math.max(1, ...history.map((h) => h.total));

  const vigilanceColor =
    report.vigilance === 'Alerte critique'
      ? palette.error
      : report.vigilance === 'Vigilance élevée'
        ? palette.severity.HIGH
        : report.vigilance === 'Vigilance modérée'
          ? palette.severity.MODERATE
          : palette.severity.LOW;

  return (
    <BentoScreen>
      <BentoPanel tone="glass" style={{ gap: 12 }}>
        <AppText variant="h3">Rapport de sécurité</AppText>
        <AppText variant="caption" color={palette.muted}>
          Preuves, SMS à risque et humeur, agrégés par mois.
        </AppText>
      </BentoPanel>

      <BentoRow style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {months.map((month) => (
          <BentoChip key={month} label={new Date(`${month}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })} active={selected === month} onPress={() => setSelected(month)} />
        ))}
      </BentoRow>

      <BentoPanel style={{ borderColor: vigilanceColor + '66' }} contentStyle={{ gap: 14, padding: 14, borderRadius: radius.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <AppText variant="micro" color={palette.muted}>NIVEAU DE VIGILANCE</AppText>
          <AppText variant="title">{report.vigilance}</AppText>
        </View>

        <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: vigilanceColor + '1F' }}>
          <Ionicons
            name={report.total === 0 ? 'shield-checkmark' : 'pulse'}
            size={21}
            color={vigilanceColor}
          />
        </View>
      </BentoPanel>

      <BentoRow style={{ gap: 12, marginTop: 12 }}>
        <BentoPanel style={{ flex: 1, gap: 4 }}>
          <AppText variant="h1">{report.total}</AppText>
          <AppText variant="caption" color={palette.muted}>Incidents ce mois</AppText>
          <AppText variant="micro" color={report.trend === 'INCREASING' ? palette.error : palette.muted}>
            {report.trend === 'NONE' ? 'Aucune donnée' : report.trend === 'STABLE' ? 'Stable vs mois précédent' : 'En hausse'}
            {report.deltaPercent != null && report.trend !== 'NONE' ? ` • ${report.deltaPercent > 0 ? '+' : ''}${report.deltaPercent}%` : ''}
          </AppText>
        </BentoPanel>

        <BentoPanel style={{ flex: 1, gap: 4 }}>
          <AppText variant="h1" color={palette.error}>{report.highRisk}</AppText>
          <AppText variant="caption" color={palette.muted}>Haut risque</AppText>
          <AppText variant="micro" color={palette.muted}>Urgence moy. {report.averageUrgency}/100</AppText>
        </BentoPanel>
      </BentoRow>

      <BentoPanel style={{ gap: 10 }}>
        <AppText variant="h3">Six derniers mois</AppText>
        <AppText variant="caption" color={palette.muted}>Nombre d’incidents par mois.</AppText>
      </BentoPanel>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 110 }}>
        {history.map((item) => (
          <View key={item.month} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <AppText variant="micro" color={palette.muted}>{item.total}</AppText>
            <View
              style={{
                width: '72%',
                height: Math.max(6, (item.total / maxTotal) * 72),
                borderRadius: 8,
                overflow: 'hidden',
                backgroundColor: item.month === selected ? 'transparent' : palette.primaryContainer,
              }}
            >
              {item.month === selected ? (
                <LinearGradient
                  colors={[palette.primary, palette.primaryDeep]}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              ) : null}
            </View>
            <AppText variant="micro" color={palette.muted}>
              {new Date(`${item.month}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'short' })}
            </AppText>
          </View>
        ))}
      </View>

      {report.platforms.length ? (
        <BentoPanel style={{ gap: 10 }}>
          <AppText variant="h3">Plateformes</AppText>
          <AppText variant="caption" color={palette.muted}>Où les incidents se concentrent.</AppText>
          {report.platforms.map((item) => (
            <View key={item.platform} style={{ gap: 5 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="caption">{platformLabel(item.platform)}</AppText>
                <AppText variant="micro" color={palette.muted}>
                  {item.count} · {item.percent}%
                </AppText>
              </View>
              <View
                style={{
                  height: 8,
                  borderRadius: radius.pill,
                  backgroundColor: palette.surfaceAlt,
                  borderWidth: 1,
                  borderColor: palette.hairline,
                  overflow: 'hidden',
                }}
              >
                <LinearGradient
                  colors={[palette.primary, palette.primaryDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ width: Math.max(3, item.percent) + '%' as `${number}%`, height: '100%' }}
                />
              </View>
            </View>
          ))}
        </BentoPanel>
      ) : null}

      {report.categories.length ? (
        <BentoPanel style={{ gap: 8 }}>
          <AppText variant="h3">Catégories de menace</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {report.categories.map((item) => (
              <Badge key={item.label} label={`${item.label} · ${item.count}`} color={palette.secondary} />
            ))}
          </View>
        </BentoPanel>
      ) : null}

      {report.aggressors.length ? (
        <BentoPanel style={{ gap: 10 }}>
          <AppText variant="h3">Auteurs récurrents</AppText>
          <AppText variant="caption" color={palette.muted}>Repère les comptes qui reviennent.</AppText>
          {report.aggressors.map((aggressor) => (
            <View
              key={aggressor.key}
              style={{
                gap: 4,
                padding: 12,
                borderRadius: radius.md,
                backgroundColor: palette.surfaceAlt,
                borderWidth: 1,
                borderColor: palette.hairline,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>{aggressor.handle}</AppText>
                <AppText variant="micro" color={palette.error}>{aggressor.persistenceScore}/100</AppText>
              </View>
              <AppText variant="caption" color={palette.muted}>
                {aggressor.badge} • {aggressor.months} mois • {aggressor.platforms.map(platformLabel).join(', ')}
              </AppText>
            </View>
          ))}
        </BentoPanel>
      ) : null}

      {report.keywords.length ? (
        <BentoPanel style={{ gap: 8 }}>
          <AppText variant="h3">Mots-clés détectés</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {report.keywords.map((keyword) => (
              <Badge key={keyword} label={keyword} color={palette.muted} />
            ))}
          </View>
        </BentoPanel>
      ) : null}

      <BentoPanel style={{ gap: 10 }}>
        <AppText variant="h3">Recommandations</AppText>
        <AppText variant="caption" color={palette.muted}>
          {report.moodCount} check-in(s) d’humeur ce mois${report.dominantMood ? ` • dominant : ${MOODS.find((m) => m.key === report.dominantMood)?.label}` : ''}
        </AppText>
        {report.recommendations.map((recommendation, index) => (
          <View
            key={recommendation}
            style={{ flexDirection: 'row', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: palette.surfaceAlt }}
          >
            <Ionicons name="arrow-forward-circle-outline" size={18} color={palette.primary} />
            <AppText variant="bodySm" style={{ flex: 1 }}>{recommendation}</AppText>
          </View>
        ))}
      </BentoPanel>

      <Btn label="Exporter le rapport" icon="share-outline" onPress={() => shareText(`Rapport SEYLI — ${report.monthLabel}`, buildShareableReport(report))} />

      <BentoPanel tone="alt" style={{ gap: 6 }}>
        <AppText variant="label">Confidentialité</AppText>
        <AppText variant="caption" color={palette.muted}>
          Ce rapport est calculé sur ton téléphone, à partir de tes preuves et messages. Rien n’est envoyé à un serveur, sauf si tu connectes ta clé Gemini ou utilises le partage.
        </AppText>
      </BentoPanel>
    </BentoScreen>
  );
}