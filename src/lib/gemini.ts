import { AiAnalysis, CoachMode, SeverityLevel } from '../types';

const MODEL = (process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash').trim();
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MODELS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Chaque personne connecte sa propre clé Gemini depuis l'application.
 * La clé reste dans le stockage local de ce téléphone : aucune clé n'est
 * embarquée dans l'APK et SEYLI ne voit jamais passer les requêtes.
 */
let apiKey = '';

export function setGeminiApiKey(key: string | null | undefined): void {
  apiKey = (key ?? '').trim();
}

function friendlyHttpError(status: number): string {
  if (status === 400 || status === 401 || status === 403) {
    return 'Ta clé API est refusée par Google. Ouvre Réglages → Clé API IA pour la vérifier ou la remplacer.';
  }
  if (status === 429) {
    return 'Le quota de ta clé API est atteint. Réessaie plus tard ou utilise une autre clé.';
  }
  if (status >= 500) {
    return 'Le service Gemini est momentanément indisponible. Réessaie dans un instant.';
  }
  return `Gemini a répondu avec l’erreur ${status}. Vérifie ta clé dans Réglages → Clé API IA.`;
}

/**
 * Vérifie une clé sans consommer de jeton : lecture de la liste des modèles.
 * Ne modifie pas la clé active, ce qui permet de tester avant d'enregistrer.
 */
export async function verifyGeminiKey(
  key: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const clean = key.trim();
  if (clean.length < 20) {
    return { ok: false, message: 'Cette clé semble incomplète. Copie-la en entier depuis Google AI Studio.' };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${MODELS_ENDPOINT}?key=${encodeURIComponent(clean)}`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (response.ok) return { ok: true };
    return { ok: false, message: friendlyHttpError(response.status) };
  } catch {
    return {
      ok: false,
      message: 'Pas de connexion à Google. Vérifie ton réseau puis réessaie.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

interface Part {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface CallOptions {
  system?: string;
  schema?: Record<string, unknown>;
  temperature?: number;
}

async function callGemini(parts: Part[], options: CallOptions = {}): Promise<string> {
  if (!apiKey) {
    throw new Error('Aucune clé API connectée. Ouvre Réglages → Clé API IA pour ajouter la tienne.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        ...(options.system
          ? { systemInstruction: { parts: [{ text: options.system }] } }
          : {}),
        generationConfig: {
          temperature: options.temperature ?? 0.4,
          ...(options.schema
            ? {
                responseMimeType: 'application/json',
                responseSchema: options.schema,
              }
            : {}),
        },
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.warn('[SEYLI Gemini] réponse', response.status, detail.slice(0, 180));
      throw new Error(friendlyHttpError(response.status));
    }
    const json = await response.json();
    const text: string = (json?.candidates?.[0]?.content?.parts ?? [])
      .map((part: Part) => part.text ?? '')
      .join('\n')
      .trim();
    if (!text) throw new Error('Réponse IA vide.');
    return text;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Google met trop de temps à répondre. Vérifie ta connexion puis réessaie.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function parseJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

const analysisSchema = {
  type: 'OBJECT',
  properties: {
    hasHarassmentSigns: { type: 'BOOLEAN' },
    capturedTextExcerpt: { type: 'STRING' },
    severityLevel: { type: 'STRING', enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] },
    toxicityScore: { type: 'INTEGER' },
    harassmentTypes: { type: 'ARRAY', items: { type: 'STRING' } },
    manipulationTactics: { type: 'ARRAY', items: { type: 'STRING' } },
    summary: { type: 'STRING' },
    recommendedActions: { type: 'ARRAY', items: { type: 'STRING' } },
    suggestedReplies: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          tone: { type: 'STRING' },
          message: { type: 'STRING' },
        },
        required: ['tone', 'message'],
      },
    },
  },
  required: [
    'hasHarassmentSigns',
    'severityLevel',
    'toxicityScore',
    'harassmentTypes',
    'summary',
    'recommendedActions',
    'suggestedReplies',
  ],
};

const SYSTEM = [
  'Tu es un expert en protection numérique des jeunes et en prévention du cyberharcèlement au Togo.',
  'Sois toujours protecteur, objectif, rassurant, sans jamais culpabiliser la victime.',
  'Adapte tes recommandations aux jeunes au Togo (collégiens, lycéens, étudiants).',
  'Rappelle les ressources : Allô 1011 (numéro vert gratuit 24h/24), 3018, ANCy Togo (+228 97 52 58 58), Police 117, Gendarmerie 172.',
  'Réponds uniquement en français.',
].join(' ');

export async function analyzeIncident(
  text: string,
  platformLabel: string,
  image?: { base64: string; mimeType: string }
): Promise<AiAnalysis> {
  const prompt = [
    `Plateforme concernée : ${platformLabel}.`,
    text.trim()
      ? `Contenu ou contexte décrit par la jeune :\n${text.trim()}`
      : "Transcris et analyse le message visible sur la capture d'écran ci-jointe.",
    'Analyse et renvoie uniquement le JSON conforme au schéma.',
  ].join('\n');

  const parts: Part[] = [{ text: prompt }];
  if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });

  const raw = await callGemini(parts, { system: SYSTEM, schema: analysisSchema });
  const parsed = parseJson<AiAnalysis>(raw);
  return {
    ...parsed,
    severityLevel: (['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as SeverityLevel[]).includes(parsed.severityLevel)
      ? parsed.severityLevel
      : 'MODERATE',
    toxicityScore: Math.max(0, Math.min(100, Math.round(parsed.toxicityScore || 0))),
    harassmentTypes: parsed.harassmentTypes ?? [],
    manipulationTactics: parsed.manipulationTactics ?? [],
    recommendedActions: parsed.recommendedActions ?? [],
    suggestedReplies: parsed.suggestedReplies ?? [],
  };
}

export async function transcribeImage(image: { base64: string; mimeType: string }): Promise<string> {
  const raw = await callGemini(
    [
      { inlineData: { mimeType: image.mimeType, data: image.base64 } },
      {
        text: 'Transcris fidèlement tout le texte visible sur cette capture de message. Réponds uniquement avec le texte, sans commentaire.',
      },
    ],
    { system: SYSTEM, temperature: 0.1 }
  );
  return raw.slice(0, 2000);
}

const smsSchema = {
  type: 'OBJECT',
  properties: {
    priority: { type: 'STRING', enum: ['HIGH_PRIORITY', 'MEDIUM_REVIEW', 'NORMAL'] },
    category: {
      type: 'STRING',
      enum: [
        'CYBERHARASSMENT',
        'SEXTORTION_BLACKMAIL',
        'THREATS_INTIMIDATION',
        'DOXXING_IMPERSONATION',
        'SCAM_SPAM',
        'SAFE',
      ],
    },
    confidenceScore: { type: 'INTEGER' },
    signals: { type: 'ARRAY', items: { type: 'STRING' } },
    rationale: { type: 'STRING' },
    recommendedAction: { type: 'STRING' },
  },
  required: ['priority', 'category', 'confidenceScore', 'signals', 'rationale', 'recommendedAction'],
};

export async function classifySmsWithGemini(sender: string, body: string) {
  const prompt = `Classe ce SMS entrant.\nExpéditeur : ${sender.trim() || 'Inconnu'}\nMessage : ${body.trim().slice(0, 2000)}`;
  const raw = await callGemini([{ text: prompt }], {
    system:
      SYSTEM +
      ' Tu es le classifieur automatique des SMS entrants : HIGH_PRIORITY pour cyberharcèlement, chantage, sextorsion, menaces ; MEDIUM_REVIEW pour pression suspecte ; NORMAL pour un SMS bénin.',
    schema: smsSchema,
    temperature: 0.2,
  });
  const parsed = parseJson<{
    priority: 'HIGH_PRIORITY' | 'MEDIUM_REVIEW' | 'NORMAL';
    category: string;
    confidenceScore: number;
    signals: string[];
    rationale: string;
    recommendedAction: string;
  }>(raw);
  return {
    ...parsed,
    confidenceScore: Math.max(0, Math.min(100, Math.round(parsed.confidenceScore || 0))),
    signals: parsed.signals ?? [],
    classifierSource: 'Gemini + filtre embarqué',
  };
}

const COACH_MODES: Record<CoachMode, string> = {
  FAST: 'Réponds de façon brève, chaleureuse et concrète.',
  GROUNDED:
    'Appuie-toi sur des ressources réelles au Togo (Allô 1011, 3018, ANCy, Action Sociale, associations locales).',
  DEEP: "Analyse la situation en profondeur : cadre légal togolais (loi 2018-026), stratégie de preuve et de signalement.",
};

export async function coachReply(
  mode: CoachMode,
  history: { fromUser: boolean; text: string }[],
  message: string
): Promise<string> {
  const conversation = history
    .slice(-10)
    .map((m) => `${m.fromUser ? 'Jeune' : 'Coach'} : ${m.text}`)
    .join('\n');
  const prompt = `${conversation ? `Historique :\n${conversation}\n\n` : ''}Nouveau message : ${message}\n\n${COACH_MODES[mode]}`;
  return callGemini([{ text: prompt }], {
    system:
      SYSTEM +
      ' Tu es Coach SEYLI, bienveillant, calme et expert de la lutte contre le cyberharcèlement chez les jeunes filles. Réponds en français, avec des listes courtes si utile. Rappelle que la victime n’est jamais coupable. En cas de danger immédiat : Allô 1011, Police 117, Gendarmerie 172.',
    temperature: 0.6,
  });
}
