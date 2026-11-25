export type SocialPlatform =
  | 'WHATSAPP'
  | 'TIKTOK'
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'SNAPCHAT'
  | 'DISCORD'
  | 'GAMING'
  | 'SMS'
  | 'OTHER';

export const PLATFORMS: { key: SocialPlatform; label: string }[] = [
  { key: 'WHATSAPP', label: 'WhatsApp' },
  { key: 'TIKTOK', label: 'TikTok' },
  { key: 'FACEBOOK', label: 'Facebook' },
  { key: 'INSTAGRAM', label: 'Instagram' },
  { key: 'SNAPCHAT', label: 'Snapchat' },
  { key: 'DISCORD', label: 'Discord' },
  { key: 'GAMING', label: 'Jeux en ligne' },
  { key: 'SMS', label: 'SMS / Appels' },
  { key: 'OTHER', label: 'Autre' },
];

export type SeverityLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export const SEVERITIES: { key: SeverityLevel; label: string; rank: number }[] = [
  { key: 'LOW', label: 'Faible', rank: 1 },
  { key: 'MODERATE', label: 'Modéré', rank: 2 },
  { key: 'HIGH', label: 'Élevé', rank: 3 },
  { key: 'CRITICAL', label: 'Critique', rank: 4 },
];

export type EvidenceStatus = 'ARCHIVED' | 'REPORTED' | 'ESCALATED';
export const STATUSES: { key: EvidenceStatus; label: string }[] = [
  { key: 'ARCHIVED', label: 'Archivée' },
  { key: 'REPORTED', label: 'Signalée' },
  { key: 'ESCALATED', label: 'Transmise (1011 / ANCy)' },
];

export type MoodType = 'CALM' | 'ANXIOUS' | 'SAD' | 'ANGRY' | 'HOPEFUL';
export const MOODS: { key: MoodType; label: string; tip: string; emoji: string }[] = [
  {
    key: 'CALM',
    label: 'Serein(e)',
    emoji: '🌿',
    tip: "Garde ce calme. Ton espace reste prêt si tu as besoin d'archiver quoi que ce soit.",
  },
  {
    key: 'ANXIOUS',
    label: 'Anxieux(se)',
    emoji: '🌊',
    tip: "Prends une grande inspiration. Tu n'es pas seul(e) et tu n'es jamais responsable du harcèlement.",
  },
  {
    key: 'SAD',
    label: 'Triste',
    emoji: '💧',
    tip: 'Ce que tu ressens est légitime. Parler à un proche ou appeler Allô 1011 peut alléger ce poids.',
  },
  {
    key: 'ANGRY',
    label: 'En colère',
    emoji: '🔥',
    tip: 'Ta colère est compréhensible. Ne réponds pas à chaud : archive d’abord les preuves ici.',
  },
  {
    key: 'HOPEFUL',
    label: 'Optimiste',
    emoji: '🌅',
    tip: 'Bravo pour ta force. Chaque étape que tu poses te protège durablement.',
  },
];

export type SmsPriority = 'HIGH_PRIORITY' | 'MEDIUM_REVIEW' | 'NORMAL';
export type SmsCategory =
  | 'CYBERHARASSMENT'
  | 'SEXTORTION_BLACKMAIL'
  | 'THREATS_INTIMIDATION'
  | 'DOXXING_IMPERSONATION'
  | 'SCAM_SPAM'
  | 'SAFE';
export const SMS_CATEGORY_LABELS: Record<SmsCategory, string> = {
  CYBERHARASSMENT: 'Cyberharcèlement',
  SEXTORTION_BLACKMAIL: 'Chantage / Sextorsion',
  THREATS_INTIMIDATION: 'Menaces & Intimidation',
  DOXXING_IMPERSONATION: 'Doxxing / Usurpation',
  SCAM_SPAM: 'Suspect / Pression',
  SAFE: 'Message ordinaire',
};
export const SMS_PRIORITY_LABELS: Record<SmsPriority, string> = {
  HIGH_PRIORITY: 'Haute Priorité',
  MEDIUM_REVIEW: 'À vérifier',
  NORMAL: 'Normal',
};
export type SmsReviewStatus = 'PENDING_REVIEW' | 'ARCHIVED_TO_VAULT' | 'REVIEWED_SAFE';

export type ZoneRiskLevel = 'SAFE' | 'CAUTION' | 'HIGH_RISK';
export const ZONE_LABELS: Record<ZoneRiskLevel, string> = {
  SAFE: 'Zone sûre',
  CAUTION: 'Vigilance',
  HIGH_RISK: 'Haut risque',
};
export type ZoneOutcome = 'SAFE_CONFIRMED' | 'SNOOZED_10_MIN' | 'SOS_TRIGGERED';

export type CoachMode = 'FAST' | 'GROUNDED' | 'DEEP';
export const COACH_MODES: { key: CoachMode; label: string; subtitle: string }[] = [
  { key: 'FAST', label: 'Rapide', subtitle: 'Réponses instantanées' },
  { key: 'GROUNDED', label: 'Équilibre', subtitle: 'Conseils + ressources Togo' },
  { key: 'DEEP', label: 'Approfondi', subtitle: 'Analyse juridique & stratégie' },
];

export interface Evidence {
  id: string;
  title: string;
  platform: SocialPlatform;
  perpetratorHandle: string;
  contentExcerpt: string;
  severity: SeverityLevel;
  categories: string[];
  status: EvidenceStatus;
  urgencyScore?: number;
  aiSummary?: string;
  detectedKeywords?: string[];
  detectedPatterns?: string[];
  notes?: string;
  screenshotUri?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TrustedContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  createdAt: number;
}

export interface MoodCheckin {
  id: string;
  mood: MoodType;
  note?: string;
  createdAt: number;
}

export interface SavedPlace {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  phone?: string;
  latitude: number;
  longitude: number;
  createdAt: number;
}

export interface SmsMessage {
  id: string;
  sender: string;
  body: string;
  receivedAt: number;
  priority: SmsPriority;
  category: SmsCategory;
  confidenceScore: number;
  signals: string[];
  rationale: string;
  recommendedAction: string;
  reviewStatus: SmsReviewStatus;
  linkedEvidenceId?: string;
}

export interface SafetyZone {
  id: string;
  name: string;
  riskLevel: ZoneRiskLevel;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  dwellThresholdMinutes: number;
  note?: string;
  enabled: boolean;
  createdAt: number;
}

export interface ZoneCheckInRecord {
  id: string;
  zoneId: string;
  zoneName: string;
  riskLevel: ZoneRiskLevel;
  outcome: ZoneOutcome;
  dwellMinutes: number;
  timestamp: number;
}

export interface SupportCenter {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  phone: string;
  description: string;
  latitude: number;
  longitude: number;
}

export interface AiAnalysis {
  hasHarassmentSigns: boolean;
  severityLevel: SeverityLevel;
  toxicityScore: number;
  harassmentTypes: string[];
  manipulationTactics: string[];
  summary: string;
  recommendedActions: string[];
  suggestedReplies: { tone: string; message: string }[];
}

export interface CoachMessage {
  id: string;
  fromUser: boolean;
  text: string;
  pending?: boolean;
}

export interface InsightAggressor {
  key: string;
  handle: string;
  count: number;
  months: number;
  platforms: SocialPlatform[];
  maxSeverity: SeverityLevel;
  persistenceScore: number;
  badge: string;
}

export interface MonthlyReport {
  monthKey: string;
  monthLabel: string;
  total: number;
  previousTotal: number;
  highRisk: number;
  averageUrgency: number;
  deltaPercent: number | null;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'NONE';
  escalated: number;
  vigilance: string;
  platforms: { platform: SocialPlatform; count: number; percent: number }[];
  categories: { label: string; count: number; percent: number }[];
  aggressors: InsightAggressor[];
  keywords: string[];
  moodCount: number;
  dominantMood?: MoodType;
  recommendations: string[];
}
