import {
  Evidence,
  InsightAggressor,
  MonthlyReport,
  MoodCheckin,
  MoodType,
  PLATFORMS,
  SMS_CATEGORY_LABELS,
  SeverityLevel,
  SmsMessage,
  SocialPlatform,
} from '../types';

const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const monthLabel = (key: string) => {
  const [year, month] = key.split('-').map(Number);
  return `${MONTHS_FR[month - 1] ?? ''} ${year}`;
};

export function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return monthKey(date);
}

const severityRank: Record<SeverityLevel, number> = { LOW: 1, MODERATE: 2, HIGH: 3, CRITICAL: 4 };

const urgencyFor = (e: Evidence) =>
  e.urgencyScore ??
  ({ LOW: 22, MODERATE: 48, HIGH: 76, CRITICAL: 92 }[e.severity] ?? 48);

const isHarassmentSms = (m: SmsMessage) =>
  m.reviewStatus !== 'REVIEWED_SAFE' &&
  (m.priority === 'HIGH_PRIORITY' || (m.priority === 'MEDIUM_REVIEW' && m.category !== 'SAFE'));

const normalizeHandle = (raw: string): string => {
  const value = raw.trim();
  if (!value) return '';
  if (['inconnu', 'inconnue', 'anonyme', 'non précisé', '-'].includes(value.toLowerCase())) return '';
  const digits = value.replace(/[\s+().-]/g, '');
  if (digits.length >= 8 && /^\d+$/.test(digits)) return `phone:${digits.slice(-8)}`;
  return `handle:${value.replace(/^@/, '').toLowerCase()}`;
};

const platformLabel = (platform: SocialPlatform) =>
  PLATFORMS.find((p) => p.key === platform)?.label ?? platform;

export function buildMonthlyReport(
  evidences: Evidence[],
  smsMessages: SmsMessage[],
  moods: MoodCheckin[],
  selectedMonth: string
): MonthlyReport {
  const previousMonth = shiftMonth(selectedMonth, -1);

  const monthEvidences = evidences.filter((e) => monthKey(new Date(e.createdAt)) === selectedMonth);
  const prevEvidences = evidences.filter((e) => monthKey(new Date(e.createdAt)) === previousMonth);
  const monthSms = smsMessages.filter(
    (m) => isHarassmentSms(m) && monthKey(new Date(m.receivedAt)) === selectedMonth
  );
  const prevSms = smsMessages.filter(
    (m) => isHarassmentSms(m) && monthKey(new Date(m.receivedAt)) === previousMonth
  );

  const total = monthEvidences.length + monthSms.length;
  const previousTotal = prevEvidences.length + prevSms.length;
  const highRisk =
    monthEvidences.filter((e) => e.severity === 'HIGH' || e.severity === 'CRITICAL' || urgencyFor(e) >= 70).length +
    monthSms.filter((m) => m.priority === 'HIGH_PRIORITY').length;

  const urgencyValues = [
    ...monthEvidences.map(urgencyFor),
    ...monthSms.map((m) => m.confidenceScore),
  ];
  const averageUrgency = urgencyValues.length
    ? Math.round(urgencyValues.reduce((a, b) => a + b, 0) / urgencyValues.length)
    : 0;

  const deltaPercent =
    previousTotal === 0 ? (total === 0 ? 0 : null) : Math.round(((total - previousTotal) / previousTotal) * 100);
  const trend =
    total === 0 && previousTotal === 0
      ? 'NONE'
      : previousTotal === 0 || total > previousTotal
        ? 'INCREASING'
        : total < previousTotal
          ? 'DECREASING'
          : 'STABLE';

  const platformCounts = new Map<SocialPlatform, number>();
  monthEvidences.forEach((e) => platformCounts.set(e.platform, (platformCounts.get(e.platform) ?? 0) + 1));
  monthSms.forEach(() => platformCounts.set('SMS', (platformCounts.get('SMS') ?? 0) + 1));
  const platforms = [...platformCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([platform, count]) => ({
      platform,
      count,
      percent: total ? Math.round((count * 100) / total) : 0,
    }));

  const categoryCounts = new Map<string, number>();
  monthEvidences.forEach((e) => {
    const cats = e.categories.length
      ? e.categories
      : e.detectedPatterns?.length
        ? e.detectedPatterns
        : ['Preuve archivée'];
    cats.forEach((cat) => categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1));
  });
  monthSms.forEach((m) => {
    const label = SMS_CATEGORY_LABELS[m.category];
    categoryCounts.set(label, (categoryCounts.get(label) ?? 0) + 1);
  });
  const categories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({
      label,
      count,
      percent: total ? Math.min(100, Math.round((count * 100) / total)) : 0,
    }));

  const aggressorMap = new Map<
    string,
    {
      handle: string;
      count: number;
      months: Set<string>;
      platforms: Set<SocialPlatform>;
      maxSeverity: SeverityLevel;
    }
  >();
  evidences.forEach((e) => {
    const key = normalizeHandle(e.perpetratorHandle);
    if (!key) return;
    const entry =
      aggressorMap.get(key) ??
      { handle: e.perpetratorHandle, count: 0, months: new Set<string>(), platforms: new Set<SocialPlatform>(), maxSeverity: 'LOW' as SeverityLevel };
    entry.count += 1;
    entry.months.add(monthKey(new Date(e.createdAt)));
    entry.platforms.add(e.platform);
    if (severityRank[e.severity] > severityRank[entry.maxSeverity]) entry.maxSeverity = e.severity;
    aggressorMap.set(key, entry);
  });

  const aggressors: InsightAggressor[] = [...aggressorMap.entries()]
    .map(([key, entry]) => {
      const monthCount = evidences.filter(
        (e) => normalizeHandle(e.perpetratorHandle) === key && monthKey(new Date(e.createdAt)) === selectedMonth
      ).length;
      const persistenceScore = Math.min(
        100,
        Math.max(
          10,
          monthCount * 18 +
            Math.max(0, entry.months.size - 1) * 18 +
            Math.max(0, entry.platforms.size - 1) * 12
        )
      );
      return {
        key,
        handle: entry.handle,
        count: monthCount,
        months: entry.months.size,
        platforms: [...entry.platforms],
        maxSeverity: entry.maxSeverity,
        persistenceScore,
        badge:
          entry.months.size >= 2
            ? `Récidive multi-mois (${entry.months.size} mois)`
            : entry.count >= 3
              ? `Harcèlement répété (${entry.count}×)`
              : entry.platforms.size >= 2
                ? `Multi-plateformes (${entry.platforms.size})`
                : 'Incident unique',
      };
    })
    .filter((a) => a.count > 0)
    .sort((a, b) => b.persistenceScore - a.persistenceScore);

  const keywords = [
    ...new Set(
      monthEvidences
        .flatMap((e) => e.detectedKeywords ?? [])
        .map((k) => k.trim())
        .filter((k) => k.length >= 3)
    ),
  ].slice(0, 6);

  const monthMoods = moods.filter((m) => monthKey(new Date(m.createdAt)) === selectedMonth);
  const moodCounts = new Map<MoodType, number>();
  monthMoods.forEach((m) => moodCounts.set(m.mood, (moodCounts.get(m.mood) ?? 0) + 1));
  const dominantMood = [...moodCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const vigilance =
    total === 0
      ? 'Serein'
      : highRisk >= 3 || averageUrgency >= 78 || aggressors.some((a) => a.persistenceScore >= 85)
        ? 'Alerte critique'
        : highRisk >= 1 || total >= 3 || aggressors.length > 0
          ? 'Vigilance élevée'
          : 'Vigilance modérée';

  const recommendations: string[] = [];
  if (total === 0) {
    recommendations.push(
      'Aucun signal de harcèlement enregistré ce mois-ci. Continue de garder le Coffre verrouillé par biométrie.'
    );
    recommendations.push('Active le Filtre SMS si tu veux analyser les messages suspects entrants.');
  } else {
    if (aggressors[0]) {
      recommendations.push(
        `Auteur récurrent détecté (${aggressors[0].handle}) : exporte son dossier et bloque ce compte sans répondre.`
      );
    }
    if (highRisk > 0 && monthEvidences.length > 0 && monthEvidences.every((e) => e.status === 'ARCHIVED')) {
      recommendations.push(
        `${highRisk} incident(s) à haut risque : partage le dossier avec un proche ou appelle Allô 1011.`
      );
    }
    if (platforms[0]) {
      recommendations.push(
        `La majorité des incidents vient de ${platformLabel(platforms[0].platform)} : renforce la confidentialité de ton profil.`
      );
    }
    if (dominantMood === 'ANXIOUS' || dominantMood === 'SAD' || dominantMood === 'ANGRY') {
      recommendations.push(
        'Ton suivi bien-être montre une charge émotionnelle : parle au Coach SEYLI ou à ton cercle de confiance.'
      );
    }
  }

  return {
    monthKey: selectedMonth,
    monthLabel: monthLabel(selectedMonth),
    total,
    previousTotal,
    highRisk,
    averageUrgency,
    deltaPercent,
    trend,
    escalated: monthEvidences.filter((e) => e.status !== 'ARCHIVED').length,
    vigilance,
    platforms,
    categories,
    aggressors,
    keywords,
    moodCount: monthMoods.length,
    dominantMood,
    recommendations,
  };
}

export function buildShareableReport(report: MonthlyReport): string {
  const lines = [
    `SEYLI — RAPPORT DE SÉCURITÉ MENSUEL (${report.monthLabel.toUpperCase()})`,
    `Niveau de vigilance : ${report.vigilance}`,
    `Incidents potentiels : ${report.total} (mois précédent : ${report.previousTotal})`,
    `Haut risque : ${report.highRisk} • Score d'urgence moyen : ${report.averageUrgency}/100`,
    '',
  ];
  if (report.platforms.length) {
    lines.push('Répartition par plateforme :');
    report.platforms.forEach((p) =>
      lines.push(`- ${platformLabel(p.platform)} : ${p.count} (${p.percent}%)`)
    );
    lines.push('');
  }
  if (report.recommendations.length) {
    lines.push('Recommandations SEYLI :');
    report.recommendations.forEach((r) => lines.push(`• ${r}`));
    lines.push('');
  }
  lines.push('Assistance Togo : Allô 1011 (gratuit 24h/24) • ANCy : +228 97 52 58 58');
  return lines.join('\n');
}

export const availableMonths = (): string[] => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return monthKey(d);
  });
};
