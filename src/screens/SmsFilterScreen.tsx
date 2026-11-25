import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { classifySmsWithGemini, geminiEnabled } from '../lib/gemini';
import { copyToClipboard } from '../lib/native';
import { scoreSms } from '../lib/smsFilter';
import { useApp } from '../store';
import { radius } from '../theme';
import { AppText, Badge, Btn, Card, Chip, EmptyState, Field, Screen, SectionTitle, ToggleRow } from '../ui/kit';
import { SMS_CATEGORY_LABELS, SMS_PRIORITY_LABELS, SmsMessage, SmsPriority } from '../types';

const PRIORITY_COLORS: Record<SmsPriority, 'LOW' | 'MODERATE' | 'CRITICAL'> = {
  NORMAL: 'LOW',
  MEDIUM_REVIEW: 'MODERATE',
  HIGH_PRIORITY: 'CRITICAL',
};

type Tab = 'HIGH_PRIORITY' | 'ALL' | 'REVIEW' | 'SAFE';

export default function SmsFilterScreen() {
  const { palette, state, addSms, addEvidence, updateSms, deleteSms, set } = useApp();
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
      Alert.alert('Message vide', 'Colle le SMS reçu pour l’analyser.');
      return;
    }
    setLoading(true);
    try {
      const local = scoreSms(sender, body);
      let classification = local;
      if (geminiEnabled) {
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
    <Screen>
      <Card style={{ gap: 12 }}>
        <SectionTitle
          title="Filtre SMS intelligent"
          subtitle={geminiEnabled ? 'Classifieur Gemini + moteur embarqué' : 'Moteur local 100 % hors-ligne'}
        />
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            padding: 10,
            backgroundColor: palette.surfaceAlt,
            borderRadius: radius.md,
          }}
        >
          <Ionicons name="information-circle-outline" size={18} color={palette.tertiary} />
          <AppText variant="caption" color={palette.muted} style={{ flex: 1 }}>
            Expo Go ne peut pas lire ta boîte SMS. Colle un message pour l’analyser, ou teste avec un exemple.
            L’application Android native, elle, filtre automatiquement les SMS entrants.
          </AppText>
        </View>
        <ToggleRow
          icon="notifications-outline"
          title="Alerte auto sur SMS à risque"
          subtitle="Dans Expo Go : notification locale de démonstration uniquement."
          value={state.smsAutoFilter}
          onValueChange={(next) => {
            set('smsAutoFilter', next);
            if (next) {
              Alert.alert(
                'Filtre auto',
                'Sur Expo Go, l’interception native des SMS n’est pas disponible. Le filtre manuel reste actif.'
              );
            }
          }}
        />
        <Field label="EXPÉDITEUR" value={sender} onChangeText={setSender} placeholder="+228… ou nom du contact" maxLength={80} />
        <Field
          label="MESSAGE REÇU"
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={2000}
          placeholder="Colle ici le SMS suspect…"
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn label="Analyser" icon="scan-outline" onPress={analyze} loading={loading} style={{ flex: 1 }} />
          <Btn
            label="Exemple"
            variant="ghost"
            compact
            onPress={() => {
              setSender('+228 90 00 00 00');
              setBody(
                'Salope, tout le monde se moque de toi. Envoie 25 000 FCFA sur Flooz ce soir sinon je publie tes photos !!!'
              );
            }}
          />
        </View>
      </Card>

      <View style={{ gap: 10 }}>
        <SectionTitle title="Messages analysés" subtitle={`${state.sms.length} message(s)`} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label="Tous" active={tab === 'ALL'} onPress={() => setTab('ALL')} />
          <Chip label="Haute priorité" active={tab === 'HIGH_PRIORITY'} onPress={() => setTab('HIGH_PRIORITY')} />
          <Chip label="À vérifier" active={tab === 'REVIEW'} onPress={() => setTab('REVIEW')} />
          <Chip label="Sûrs" active={tab === 'SAFE'} onPress={() => setTab('SAFE')} />
        </View>
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon="chatbox-ellipses-outline"
          title="Aucun message ici"
          body="Colle un SMS suspect ci-dessus : SEYLI détecte menaces, chantage, sextorsion et humiliation."
        />
      ) : (
        filtered.map((message) => {
          const color = palette.severity[PRIORITY_COLORS[message.priority]];
          return (
            <Card key={message.id} style={{ gap: 8, borderColor: color + '55' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Badge label={SMS_PRIORITY_LABELS[message.priority]} color={color} />
                <Badge label={SMS_CATEGORY_LABELS[message.category]} color={palette.secondary} />
                <View style={{ flex: 1 }} />
                <AppText variant="micro" color={palette.muted}>
                  {message.confidenceScore}/100
                </AppText>
              </View>
              <AppText variant="label" numberOfLines={1}>
                {message.sender}
              </AppText>
              <AppText variant="bodySm" color={palette.muted} numberOfLines={3}>
                {message.body}
              </AppText>
              <AppText variant="caption">{message.rationale}</AppText>
              {message.signals.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {message.signals.slice(0, 4).map((signal) => (
                    <Badge key={signal} label={signal} color={palette.muted} />
                  ))}
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Btn
                  label="Archiver"
                  icon="lock-closed-outline"
                  compact
                  variant="secondary"
                  onPress={() => archiveSms(message)}
                />
                <Btn
                  label="Copier"
                  icon="copy-outline"
                  compact
                  variant="ghost"
                  onPress={async () => {
                    const copied = await copyToClipboard(`${message.sender}: ${message.body}`);
                    Alert.alert(copied ? 'Copié' : 'Copie impossible', copied ? undefined : 'Le presse-papiers est indisponible.');
                  }}
                />
                <Btn
                  label="Sûr"
                  icon="checkmark-circle-outline"
                  compact
                  variant="ghost"
                  onPress={() => updateSms(message.id, { reviewStatus: 'REVIEWED_SAFE' })}
                />
                <Btn
                  label="Supprimer"
                  icon="trash-outline"
                  compact
                  variant="ghost"
                  onPress={() =>
                    Alert.alert('Supprimer ce message ?', 'Il disparaîtra de l’historique local.', [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Supprimer', style: 'destructive', onPress: () => deleteSms(message.id) },
                    ])
                  }
                />
              </View>
            </Card>
          );
        })
      )}

      <Card tone="alt" style={{ gap: 8 }}>
        <AppText variant="label">Numéros à connaître</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { label: 'Allô 1011', number: '1011' },
            { label: '3018', number: '3018' },
            { label: 'Police 117', number: '117' },
            { label: 'ANCy', number: '+22897525858' },
          ].map((item) => (
            <Pressable
              key={item.number}
              onPress={() => Linking.openURL(`tel:${item.number}`)}
              style={{
                paddingHorizontal: 11,
                paddingVertical: 7,
                borderRadius: radius.pill,
                backgroundColor: palette.surface,
                borderWidth: 1,
                borderColor: palette.outline,
              }}
            >
              <AppText variant="micro">{item.label}</AppText>
            </Pressable>
          ))}
        </View>
      </Card>
    </Screen>
  );
}
