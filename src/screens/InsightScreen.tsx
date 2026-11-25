import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { availableMonths, buildMonthlyReport, buildShareableReport } from '../lib/insights';
import { shareText } from '../lib/emergency';
import { useApp } from '../store';
import { radius } from '../theme';
import { AppText, Badge, Btn, Card, Chip, Screen, SectionTitle } from '../ui/kit';
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
    <Screen>
      <Card style={{ gap: 12 }}>
        <SectionTitle
          title="Rapport de sécurité"
          subtitle="Preuves, SMS à risque et humeur, agrégés par mois."
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {months.map((month) => (
            <Chip
              key={month}
              label={new Date(`${month}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
              active={selected === month}
              onPress={() => setSelected(month)}
            />
          ))}
        </View>
        <LinearGradient
          colors={[vigilanceColor + '24', vigilanceColor + '0A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 14,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: vigilanceColor + '3D',
          }}
        >
          <View style={{ gap: 3 }}>
            <AppText variant="micro" color={palette.muted}>
              NIVEAU DE VIGILANCE
            </AppText>
            <AppText variant="title">{report.vigilance}</AppText>
          </View>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: Math.round(44 * 0.34),
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: vigilanceColor + '1F',
            }}
          >
            <Ionicons
              name={report.total === 0 ? 'shield-checkmark' : 'pulse'}
              size={21}
              color={vigilanceColor}
            />
          </View>
        </LinearGradient>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1, gap: 4 }}>
          <AppText variant="h1">{report.total}</AppText>
          <AppText variant="caption" color={palette.muted}>
            Incidents ce mois
          </AppText>
          <AppText variant="micro" color={report.trend === 'INCREASING' ? palette.error : palette.muted}>
            {report.trend === 'NONE'
              ? 'Aucune donnée'
              : report.trend === 'STABLE'
                ? 'Stable vs mois précédent'
                : report.trend === 'INCREASING'
                  ? 'En hausse'
                  : 'En baisse'}
            {report.deltaPercent != null && report.trend !== 'NONE' ? ` • ${report.deltaPercent > 0 ? '+' : ''}${report.deltaPercent}%` : ''}
          </AppText>
        </Card>
        <Card style={{ flex: 1, gap: 4 }}>
          <AppText variant="h1" color={palette.error}>
            {report.highRisk}
          </AppText>
          <AppText variant="caption" color={palette.muted}>
            Haut risque
          </AppText>
          <AppText variant="micro" color={palette.muted}>
            Urgence moy. {report.averageUrgency}/100
          </AppText>
        </Card>
      </View>

      <Card style={{ gap: 10 }}>
        <SectionTitle title="Six derniers mois" subtitle="Nombre d’incidents par mois." />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 110 }}>
          {history.map((item) => (
            <View key={item.month} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <AppText variant="micro" color={palette.muted}>
                {item.total}
              </AppText>
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
      </Card>

      {report.platforms.length ? (
        <Card style={{ gap: 10 }}>
          <SectionTitle title="Plateformes" subtitle="Où les incidents se concentrent." />
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
                  style={{ width: `${Math.max(3, item.percent)}%` as `${number}%`, height: '100%' }}
                />
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {report.categories.length ? (
        <Card style={{ gap: 8 }}>
          <SectionTitle title="Catégories de menace" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {report.categories.map((item) => (
              <Badge key={item.label} label={`${item.label} · ${item.count}`} color={palette.secondary} />
            ))}
          </View>
        </Card>
      ) : null}

      {report.aggressors.length ? (
        <Card style={{ gap: 10 }}>
          <SectionTitle title="Auteurs récurrents" subtitle="Repère les comptes qui reviennent." />
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
                <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>
                  {aggressor.handle}
                </AppText>
                <AppText variant="micro" color={palette.error}>
                  {aggressor.persistenceScore}/100
                </AppText>
              </View>
              <AppText variant="caption" color={palette.muted}>
                {aggressor.badge} • {aggressor.months} mois • {aggressor.platforms.map(platformLabel).join(', ')}
              </AppText>
            </View>
          ))}
        </Card>
      ) : null}

      {report.keywords.length ? (
        <Card style={{ gap: 8 }}>
          <SectionTitle title="Mots-clés détectés" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {report.keywords.map((keyword) => (
              <Badge key={keyword} label={keyword} color={palette.muted} />
            ))}
          </View>
        </Card>
      ) : null}

      <Card style={{ gap: 10 }}>
        <SectionTitle
          title="Recommandations"
          subtitle={`${report.moodCount} check-in(s) d’humeur ce mois${
            report.dominantMood ? ` • dominant : ${MOODS.find((m) => m.key === report.dominantMood)?.label}` : ''
          }`}
        />
        {report.recommendations.map((recommendation) => (
          <View key={recommendation} style={{ flexDirection: 'row', gap: 8 }}>
            <Ionicons name="arrow-forward-circle-outline" size={18} color={palette.primary} />
            <AppText variant="bodySm" style={{ flex: 1 }}>
              {recommendation}
            </AppText>
          </View>
        ))}
      </Card>

      <Btn
        label="Exporter le rapport"
        icon="share-outline"
        onPress={() => shareText(`Rapport SEYLI — ${report.monthLabel}`, buildShareableReport(report))}
      />

      <Card tone="alt" style={{ gap: 6 }}>
        <AppText variant="label">Confidentialité</AppText>
        <AppText variant="caption" color={palette.muted}>
          Ce rapport est calculé sur ton téléphone, à partir de tes preuves et messages. Rien n’est envoyé à un
          serveur, sauf si tu utilises l’analyse Gemini ou le partage.
        </AppText>
      </Card>
    </Screen>
  );
}
