import { SmsCategory, SmsPriority } from '../types';

export interface SmsClassification {
  priority: SmsPriority;
  category: SmsCategory;
  confidenceScore: number;
  signals: string[];
  rationale: string;
  recommendedAction: string;
  classifierSource: string;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, " ")
    .replace(/\s+/g, ' ')
    .trim();

interface Feature {
  phrase: string;
  weight: number;
  category: SmsCategory;
  label: string;
}

const FEATURES: Feature[] = [
  { phrase: 'sextorsion', weight: 3.6, category: 'SEXTORTION_BLACKMAIL', label: 'Sextorsion' },
  { phrase: 'nudes', weight: 3.4, category: 'SEXTORTION_BLACKMAIL', label: 'Demande de photos intimes' },
  { phrase: 'photo intime', weight: 3.5, category: 'SEXTORTION_BLACKMAIL', label: 'Photos intimes' },
  { phrase: 'photos intimes', weight: 3.5, category: 'SEXTORTION_BLACKMAIL', label: 'Photos intimes' },
  { phrase: 'video intime', weight: 3.5, category: 'SEXTORTION_BLACKMAIL', label: 'Vidéo intime' },
  { phrase: 'publier partout', weight: 3.2, category: 'SEXTORTION_BLACKMAIL', label: 'Menace de diffusion' },
  { phrase: 'envoyer a tes parents', weight: 3.3, category: 'SEXTORTION_BLACKMAIL', label: 'Chantage familial' },
  { phrase: 'si tu ne paies pas', weight: 3.0, category: 'SEXTORTION_BLACKMAIL', label: 'Extorsion financière' },
  { phrase: 'si tu paies pas', weight: 3.0, category: 'SEXTORTION_BLACKMAIL', label: 'Extorsion financière' },
  { phrase: 'sinon je publie', weight: 3.3, category: 'SEXTORTION_BLACKMAIL', label: 'Chantage à la publication' },
  { phrase: 'je vais te retrouver', weight: 3.4, category: 'THREATS_INTIMIDATION', label: 'Menace de poursuite' },
  { phrase: 'je sais ou tu habites', weight: 3.5, category: 'THREATS_INTIMIDATION', label: 'Localisation / filature' },
  { phrase: 'tu vas le regretter', weight: 2.9, category: 'THREATS_INTIMIDATION', label: 'Menace de représailles' },
  { phrase: 'je vais te frapper', weight: 3.5, category: 'THREATS_INTIMIDATION', label: 'Menace physique' },
  { phrase: 'je vais te tuer', weight: 4.0, category: 'THREATS_INTIMIDATION', label: 'Menace grave' },
  { phrase: 'va mourir', weight: 3.8, category: 'THREATS_INTIMIDATION', label: 'Incitation à la mort' },
  { phrase: 'suicide', weight: 3.5, category: 'THREATS_INTIMIDATION', label: 'Mention critique de suicide' },
  { phrase: 'pute', weight: 3.1, category: 'CYBERHARASSMENT', label: 'Insulte sexiste' },
  { phrase: 'salope', weight: 3.2, category: 'CYBERHARASSMENT', label: 'Insulte sexiste' },
  { phrase: 'connasse', weight: 3.0, category: 'CYBERHARASSMENT', label: 'Insulte violente' },
  { phrase: 'trainee', weight: 2.7, category: 'CYBERHARASSMENT', label: 'Diffamation' },
  { phrase: 'tout le monde se moque', weight: 2.7, category: 'CYBERHARASSMENT', label: 'Humiliation de groupe' },
  { phrase: 'personne ne t aime', weight: 2.6, category: 'CYBERHARASSMENT', label: 'Isolement psychologique' },
  { phrase: 'ferme ta gueule', weight: 2.7, category: 'CYBERHARASSMENT', label: 'Agressivité verbale' },
  { phrase: 'ta gueule', weight: 2.5, category: 'CYBERHARASSMENT', label: 'Agressivité verbale' },
  { phrase: 'bitch', weight: 2.9, category: 'CYBERHARASSMENT', label: 'Insulte' },
  { phrase: 'rumeur', weight: 1.8, category: 'CYBERHARASSMENT', label: 'Propagation de rumeur' },
  { phrase: 'ton adresse', weight: 2.5, category: 'DOXXING_IMPERSONATION', label: "Ciblage d'adresse" },
  { phrase: 'faux compte', weight: 2.4, category: 'DOXXING_IMPERSONATION', label: 'Usurpation de compte' },
  { phrase: 'partager ton numero', weight: 3.0, category: 'DOXXING_IMPERSONATION', label: 'Doxxing de numéro' },
  { phrase: 'reponds maintenant', weight: 1.8, category: 'SCAM_SPAM', label: 'Pression immédiate' },
  { phrase: 'tout de suite sinon', weight: 2.5, category: 'SCAM_SPAM', label: 'Ultimatum' },
  { phrase: 'ce soir sinon', weight: 2.6, category: 'SCAM_SPAM', label: 'Ultimatum temporel' },
  { phrase: 'ne bloque pas', weight: 1.7, category: 'SCAM_SPAM', label: 'Tentative de contrôle' },
];

const BENIGN: Record<string, number> = {
  bonjour: -0.6,
  bonsoir: -0.5,
  maman: -0.9,
  papa: -0.9,
  cours: -0.7,
  devoir: -0.7,
  examen: -0.8,
  reunion: -0.7,
  'code de verification': -1.8,
  otp: -1.8,
  togocom: -1.4,
  moov: -1.4,
  solde: -1.2,
  merci: -0.7,
  'bonne journee': -0.9,
  'a demain': -0.8,
};

export function scoreSms(sender: string, body: string): SmsClassification {
  const raw = body.trim();
  const text = normalize(raw);
  const tokens = text.split(' ').filter(Boolean);
  const signals: string[] = [];
  const categoryWeights: Partial<Record<SmsCategory, number>> = {};
  let logit = -2.15;

  for (const feature of FEATURES) {
    const hit = feature.phrase.includes(' ')
      ? text.includes(feature.phrase)
      : tokens.some((token) => token === feature.phrase || token.startsWith(feature.phrase));
    if (hit) {
      logit += feature.weight;
      if (!signals.includes(feature.label)) signals.push(feature.label);
      categoryWeights[feature.category] = (categoryWeights[feature.category] ?? 0) + feature.weight;
    }
  }

  for (const [term, weight] of Object.entries(BENIGN)) {
    if (text.includes(term)) logit += weight;
  }

  const letters = raw.replace(/[^\p{L}]/gu, '');
  const capsRatio =
    letters.length >= 8
      ? letters.split('').filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length / letters.length
      : 0;
  if (capsRatio >= 0.55) {
    logit += 0.85;
    signals.push('Ton crié (MAJUSCULES)');
  }
  if ((raw.match(/!/g) ?? []).length >= 3) {
    logit += 0.65;
    signals.push('Ponctuation insistante (!!!)');
  }
  if (text.includes('sinon') && (text.includes('je ') || text.includes('tu '))) {
    logit += 1.15;
    signals.push('Condition menaçante (sinon…)');
  }
  const hasMoney = /flooz|tmoney|fcfa/.test(text);
  if (hasMoney && /envoie|paie|depot/.test(text)) {
    logit += 1.4;
    signals.push('Demande d’argent mobile');
  }

  const probability = 1 / (1 + Math.exp(-logit));
  const confidence = Math.round(probability * 100);
  const priority: SmsPriority =
    probability >= 0.62 ? 'HIGH_PRIORITY' : probability >= 0.32 ? 'MEDIUM_REVIEW' : 'NORMAL';

  let category: SmsCategory = 'SAFE';
  if (priority !== 'NORMAL' || probability >= 0.2) {
    const best = Object.entries(categoryWeights).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
    category = (best?.[0] as SmsCategory) ?? 'SAFE';
  }

  const rationale =
    category === 'SAFE'
      ? 'Aucun signal fort de cyberharcèlement détecté par le filtre embarqué.'
      : `Signaux détectés : ${signals.slice(0, 3).join(', ')}. Score de risque ${confidence}/100.`;

  return {
    priority,
    category,
    confidenceScore: confidence,
    signals: signals.slice(0, 6),
    rationale,
    recommendedAction:
      priority === 'HIGH_PRIORITY'
        ? "Ne réponds pas, archive ce message comme preuve et préviens un proche ou appelle Allô 1011."
        : 'Reste vigilante et conserve le message au cas où la situation s’aggrave.',
    classifierSource: 'Filtre embarqué SEYLI',
  };
}

/** Offline fallback used by the analyzer when no Gemini key is configured. */
export function offlineAnalysis(text: string) {
  const result = scoreSms('Analyse locale', text);
  const severity =
    result.confidenceScore >= 80
      ? 'CRITICAL'
      : result.confidenceScore >= 60
        ? 'HIGH'
        : result.confidenceScore >= 30
          ? 'MODERATE'
          : 'LOW';
  return {
    hasHarassmentSigns: result.priority !== 'NORMAL',
    severityLevel: severity as 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL',
    toxicityScore: result.confidenceScore,
    harassmentTypes: result.signals,
    manipulationTactics: [] as string[],
    summary:
      result.priority === 'NORMAL'
        ? 'Le message ne présente pas de signal évident de harcèlement d’après le moteur local. Reste attentive si la situation se répète.'
        : `Le moteur local détecte des signaux préoccupants (${result.signals.join(', ') || result.category}). Analyse hors-ligne, sans IA distante.`,
    recommendedActions:
      result.priority === 'HIGH_PRIORITY'
        ? [
            'Ne réponds pas à chaud.',
            'Archive une capture dans le Coffre de preuves.',
            'Préviens un adulte de confiance.',
            'Appelle Allô 1011 (gratuit 24h/24) ou le 3018.',
          ]
        : ['Garde une trace du message.', 'Bloque le compte si les messages continuent.', 'Parle à un proche.'],
    suggestedReplies: [
      { tone: 'Pose de limites calme', message: 'Je ne souhaite pas continuer cette conversation. Merci de ne plus me contacter.' },
      { tone: 'Silence protecteur', message: 'Aucune réponse pour le moment : conserve la preuve et bloque le compte si besoin.' },
    ],
  };
}
