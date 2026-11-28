import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { classifySmsWithGemini } from '../lib/gemini';
import { copyToClipboard } from '../lib/native';
import { scoreSms } from '../lib/smsFilter';
import { useApp } from '../store';
import { radius } from '../theme';
import { AppText, Badge, BentoScreen, BentoPanel, BentoGrid, BentoRow, BentoChip, BentoField, BentoBtn } from '../ui/bento';
import { SMS_CATEGORY_LABELS, SMS_PRIORITY_LABELS, SmsMessage, SmsPriority } from '../types';

const PRIORITY_COLORS: Record<SmsPriority, 'LOW' | 'MODERATE' | 'CRITICAL'> = {
  NORMAL: 'LOW',
  MEDIUM_REVIEW: 'MODERATE',
  HIGH_PRIORITY: 'CRITICAL',
};

type Tab = 'HIGH_PRIORITY' | 'ALL' | 'REVIEW' | 'SAFE';

export default function SmsFilterScreen() {
  const { palette, state, addSms, addEvidence, updateSms, deleteSms, set } = useApp();
  const aiReady = state.geminiKey.trim().length > 0;
  const [sender, setSender] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('ALL');

  const filtered = useMemo(() => {
    switch (tab) {
      case 'HIGH_PRIORITY':
        return state.sms.filter((m) => m.priority === 'HIGH_PRIORITY');
      case 'REVIEW':
        return state.sms.filter((m) => m.priority === 'MEDIUM_REVIEW');
      case 'SAFE':
        return state.sms.filter((m) => m.priority === 'NORMAL');
      default:
        return state.sms;
    }
  }, [state.sms, tab]);

  const analyze = async () => {
    if (!body.trim()) {
      Alert.alert('Message vide', 'Colle le SMS reçu pour l\'analyser.');
      return;
    }
    setLoading(true);
    try {
      const local = scoreSms(sender, body);
      let classification = local;
      if (aiReady) {
        try {
          const remote = await classifySmsWithGemini(sender, body);
          classification = {
            ...local,
            priority: remote.priority,
            category: remote.category as typeof local.category,
            confidenceScore: remote.confidenceScore,
            signals: remote.signals.length ? remote.signals : local.signals,
            rationale: remote.rationale,
            recommendedAction: remote.recommendedAction,
            classifierSource: remote.classifierSource,
          };
        } catch {
          // Keep the on-device classification when Gemini is unreachable.
        }
      }
      addSms({
        sender: sender.trim() || 'Expéditeur inconnu',
        body: body.trim(),
        priority: classification.priority,
        category: classification.category,
        confidenceScore: classification.confidenceScore,
        signals: classification.signals,
        rationale: classification.rationale,
        recommendedAction: classification.recommendedAction,
        reviewStatus: 'PENDING_REVIEW',
      });
      setBody('');
      setSender('');
      if (classification.priority === 'HIGH_PRIORITY') {
        Alert.alert(
          'Risque élevé détecté',
          classification.recommendedAction,
          [
            { text: 'Plus tard' },
            { text: 'Appeler 1011', onPress: () => Linking.openURL('tel:1011') },
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const archiveSms = (message: SmsMessage) => {
    const evidence = addEvidence({
      title: `SMS suspect de ${message.sender}`.slice(0, 120),
      platform: 'SMS',
      perpetratorHandle: message.sender.slice(0, 80),
      contentExcerpt: message.body.slice(0, 2000),
      severity:
        message.priority === 'HIGH_PRIORITY' ? 'HIGH' : message.priority === 'MEDIUM_REVIEW' ? 'MODERATE' : 'LOW',
      categories: [SMS_CATEGORY_LABELS[message.category]],
      status: 'ARCHIVED',
      urgencyScore: message.confidenceScore,
      aiSummary: message.rationale,
      detectedKeywords: message.signals,
    });
    updateSms(message.id, { reviewStatus: 'ARCHIVED_TO_VAULT', linkedEvidenceId: evidence.id });
    Alert.alert('Archivé', 'Le SMS est enregistré dans le Coffre de preuves.');
  };

  return (
    <BentoScreen>
      <BentoPanel tone="glass" style={{ gap: 12 }}>
        <AppText variant="h3">Filtre SMS intelligent</AppText>
        <AppText variant="caption" color={palette.muted}>
          {aiReady ? 'Gemini avec ta clé + moteur embarqué' : 'Moteur local 100 % hors-ligne'}
        </AppText>
      </BentoPanel>

      <BentoPanel style={{ padding: 10, borderRadius: radius.md, backgroundColor: palette.surfaceAlt }}>
        <Ionicons name="information-circle-outline" size={18} color={palette.tertiary} />
        <AppText variant="caption" color={palette.muted} style={{ flex: 1 }}>
          {aiReady ? 'Colle un message reçu pour l\'analyser : il est envoyé à Google avec ta clé, puis conservé seulement sur ce téléphone.' : 'Colle un message reçu pour l\'analyser, ou teste avec un exemple : l\'analyse se fait sur ton téléphone.'}
        </AppText>
      </BentoPanel>

      <BentoRow style={{ gap: 8, marginTop: 8 }}>
        <BentoField label="EXPÉDITEUR" value={sender} onChangeText={setSender} maxLength={80} placeholder="+228… ou nom du contact" />
        <BentoField
          label="MESSAGE REÇU"
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={2000}
          placeholder="Colle ici le SMS suspect…"
        />
      </BentoRow>

      <BentoRow style={{ gap: 8, marginTop: 8 }}>
        <BentoBtn label="Analyser" icon="scan-outline" onPress={analyze} loading={loading} style={{ flex: 1 }} />
        <BentoBtn label="Exemple" variant="ghost" compact onPress={() => {
          setSender('+228 90 00 00 00');
          setBody('Salope, tout le monde se moque de toi. Envoie 25 000 FCFA sur Flooz ce soir sinon je publie tes photos !!!');
        }} />
      </BentoRow>

      <BentoPanel style={{ gap: 10, marginTop: 12 }}>
        <AppText variant="h3">Messages analysés</AppText>
        <AppText variant="caption" color={palette.muted}>{state.sms.length} message(s)</AppText>
      </BentoPanel>

      <BentoRow style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        <BentoChip label="Tous" active={tab === 'ALL'} onPress={() => setTab('ALL')} />
        <BentoChip label="Haute priorité" active={tab === 'HIGH_PRIORITY'} onPress={() => setTab('HIGH_PRIORITY')} />
        <BentoChip label="À vérifier" active={tab === 'REVIEW'} onPress={() => setTab('REVIEW')} />
        <BentoChip label="Sûrs" active={tab === 'SAFE'} onPress={() => setTab('SAFE')} />
      </BentoRow>

      {filtered.length === 0 ? (
        <AppText variant="caption" color={palette.muted}>Aucun message ici</AppText>
      ) : (
        filtered.map((message) => {
          const color = palette.severity[PRIORITY_COLORS[message.priority]];
          return (
            <BentoPanel key={message.id} style={{ gap: 8, borderColor: color + '55' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Badge label={SMS_PRIORITY_LABELS[message.priority]} color={color} />
                <Badge label={SMS_CATEGORY_LABELS[message.category]} color={palette.secondary} />
                <View style={{ flex: 1 }} />
                <AppText variant="micro" color={palette.muted}>{message.confidenceScore}/100</AppText>
              </View>
              <AppText variant="label" numberOfLines={1}>{message.sender}</AppText>
              <AppText variant="bodySm" color={palette.muted} numberOfLines={3}>{message.body}</AppText>
              <AppText variant="caption">{message.rationale}</AppText>
              {message.signals.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {message.signals.slice(0, 4).map((signal) => (
                    <Badge key={signal} label={signal} color={palette.muted} />
                  ))}
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <BentoBtn label="Archiver" icon="lock-closed-outline" variant="secondary" compact onPress={() => archiveSms(message)} />
                <BentoBtn label="Copier" icon="copy-outline" variant="ghost" compact onPress={async () => {
                  const copied = await copyToClipboard(`${message.sender}: ${message.body}`);
                  Alert.alert(copied ? 'Copié' : 'Copie impossible', copied ? undefined : 'Le presse-papiers est indisponible.');
                }} />
                <BentoBtn label="Sûr" icon="checkmark-circle-outline" variant="ghost" compact onPress={() => updateSms(message.id, { reviewStatus: 'REVIEWED_SAFE' })} />
                <BentoBtn label="Supprimer" icon="trash-outline" variant="ghost" compact onPress={() => {
                  Alert.alert('Supprimer ce message ?', 'Il disparaîtra de l\'historique local.', [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Supprimer', style: 'destructive', onPress: () => deleteSms(message.id) },
                  ]);
                }} />
              </View>
            </BentoPanel>
          );
        })
      )}

      <BentoPanel tone="alt" style={{ gap: 8 }}>
        <AppText variant="label">Numéros à connaître</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[{ label: 'Allô 1011', number: '1011' }, { label: '3018', number: '3018' }, { label: 'Police 117', number: '117' }, { label: 'ANCy', number: '+22897525858' }].map((item) => (
            <Pressable key={item.number} onPress={() => Linking.openURL(`tel:${item.number}`)} style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.outline }}>
              <AppText variant="micro">{item.label}</AppText>
            </Pressable>
          ))}
        </View>
      </BentoPanel>
    </BentoScreen>
  );
}