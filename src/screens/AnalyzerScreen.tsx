import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';
import { discardCapture, persistCapture, PickedImage } from '../lib/captures';
import { analyzeIncident, transcribeImage } from '../lib/gemini';
import { copyToClipboard, haptic } from '../lib/native';
import { offlineAnalysis } from '../lib/smsFilter';
import { useNav } from '../navigation';
import { useApp } from '../store';
import { radius } from '../theme';
import { AppText, Badge, Btn, Chip, Field, Note, SectionTitle, Sheet } from '../ui/kit';
import { BentoPanel, BentoScreen } from '../ui/bento';
import { AiAnalysis, PLATFORMS, SEVERITIES, SeverityLevel, SocialPlatform } from '../types';

const severityColor = (severity: SeverityLevel, palette: ReturnType<typeof useApp>['palette']) =>
  palette.severity[severity];

export default function AnalyzerScreen() {
  const { palette, state, addEvidence } = useApp();
  const nav = useNav();
  const aiReady = state.geminiKey.trim().length > 0;
  const [text, setText] = useState('');
  const [platform, setPlatform] = useState<SocialPlatform>('WHATSAPP');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [handle, setHandle] = useState('');

  const platformLabel = PLATFORMS.find((p) => p.key === platform)?.label ?? 'Autre';

  /**
   * Le sélecteur Android rend une URI `content://media/picker/...` que React
   * Native n'arrive plus à lire ensuite : la capture restait invisible et la
   * preuve pointait vers un fichier inaccessible. On recopie donc les octets
   * reçus dans le stockage de l'app avant d'afficher quoi que ce soit.
   */
  const attach = async (asset: ImagePicker.ImagePickerAsset) => {
    const mimeType = asset.mimeType ?? 'image/jpeg';
    if (asset.base64) {
      try {
        const uri = await persistCapture(asset.base64, mimeType);
        setImage({ uri, base64: asset.base64, mimeType });
        setAnalysis(null);
        return;
      } catch {
        // Stockage indisponible : on garde l'URI d'origine, l'analyse reste possible.
      }
    }
    setImage({ uri: asset.uri, base64: asset.base64 ?? '', mimeType });
    setAnalysis(null);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Accès refusé', 'Autorise l’accès aux photos pour choisir une capture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    await attach(result.assets[0]);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Caméra refusée', 'Autorise la caméra pour photographier un message.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    await attach(result.assets[0]);
  };

  const runAnalysis = async () => {
    if (!text.trim() && !image) {
      Alert.alert('Rien à analyser', 'Écris un message ou choisis une capture d’écran.');
      return;
    }
    setLoading(true);
    setFallbackNotice(false);
    try {
      let result: AiAnalysis;
      if (aiReady) {
        try {
          result = await analyzeIncident(
            text,
            platformLabel,
            image && image.base64 ? { base64: image.base64, mimeType: image.mimeType } : undefined
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Analyse en ligne indisponible.';
          console.warn('[SEYLI analyse] repli sur l’analyse locale :', message);
          result = offlineAnalysis(text || 'Capture sans texte') as AiAnalysis;
          setFallbackNotice(true);
        }
      } else {
        result = offlineAnalysis(text || 'Capture sans texte') as AiAnalysis;
      }
      setAnalysis(result);
      setTitle(text.trim().slice(0, 60) || 'Capture analysée');
      void haptic('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analyse impossible.';
      console.warn('[SEYLI analyse] échec de l’analyse :', message);
      Alert.alert(
        'Analyse impossible',
        'Réessaie dans un instant. Ton message reste sur cet appareil.'
      );
    } finally {
      setLoading(false);
    }
  };

  const extractText = async () => {
    if (!image || !image.base64 || !aiReady) return;
    setExtracting(true);
    try {
      const extracted = await transcribeImage({ base64: image.base64, mimeType: image.mimeType });
      setText((prev) => (prev ? `${prev}\n${extracted}` : extracted).slice(0, 2000));
    } catch (error) {
      Alert.alert('Extraction impossible', error instanceof Error ? error.message : 'Réessaie.');
    } finally {
      setExtracting(false);
    }
  };

  const archive = () => {
    if (!analysis) return;
    if (!title.trim()) {
      Alert.alert('Titre requis', 'Donne un titre à cette preuve.');
      return;
    }
    addEvidence({
      title: title.trim().slice(0, 120),
      platform,
      perpetratorHandle: handle.trim().slice(0, 80),
      contentExcerpt: (text.trim() || 'Capture d’écran analysée par SEYLI.').slice(0, 2000),
      severity: analysis.severityLevel,
      categories: analysis.harassmentTypes.slice(0, 10),
      status: 'ARCHIVED',
      urgencyScore: analysis.toxicityScore,
      aiSummary: analysis.summary.slice(0, 1500),
      detectedKeywords: analysis.manipulationTactics.slice(0, 10),
      screenshotUri: image?.uri,
      notes: undefined,
    });
    setArchiveOpen(false);
    setAnalysis(null);
    setText('');
    setImage(null);
    setTitle('');
    setHandle('');
    Alert.alert('Preuve archivée', 'Elle est disponible dans le Coffre de preuves.', [
      { text: 'Rester ici' },
      { text: 'Ouvrir le coffre', onPress: () => nav.goTab('vault') },
    ]);
  };

  const color = analysis ? severityColor(analysis.severityLevel, palette) : palette.primary;

  return (
    <>
      <BentoScreen>
        <BentoPanel contentStyle={{ gap: 10 }}>
          <SectionTitle
            title="Analyser une situation"
            subtitle={
              aiReady
                ? 'Analyse Gemini avec ta clé • seul ce message est envoyé'
                : 'Analyse locale • rien ne quitte ton téléphone'
            }
          />
          {!aiReady ? (
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                backgroundColor: palette.surfaceAlt,
                borderRadius: radius.md,
                padding: 10,
              }}
            >
              <Ionicons name="information-circle-outline" size={18} color={palette.tertiary} />
              <AppText variant="caption" color={palette.muted} style={{ flex: 1 }}>
                L’analyse se fait sur ton téléphone, sans connexion : SEYLI repère les menaces,
                le chantage et les insultes connus, puis te propose quoi faire. Connecte ta clé
                Gemini personnelle pour une analyse plus fine.
              </AppText>
            </View>
          ) : null}
          {!aiReady ? (
            <Btn
              label="Connecter ma clé API"
              icon="key-outline"
              variant="secondary"
              compact
              onPress={() => nav.navigate('apikey')}
            />
          ) : null}
          <AppText variant="micro" color={palette.muted}>
            PLATEFORME
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PLATFORMS.map((p) => (
              <Chip key={p.key} label={p.label} active={platform === p.key} onPress={() => setPlatform(p.key)} />
            ))}
          </View>
          <Field
            label="MESSAGE OU CONTEXTE"
            placeholder="Colle ici le message reçu, décris la situation…"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
          />
          {image ? (
            <View style={{ gap: 8 }}>
              <Image
                source={{ uri: image.uri }}
                style={{ width: '100%', height: 190, borderRadius: radius.md }}
                resizeMode="cover"
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn
                  label="Extraire le texte"
                  icon="text-outline"
                  variant="secondary"
                  compact
                  loading={extracting}
                  disabled={!aiReady}
                  onPress={extractText}
                  style={{ flex: 1 }}
                />
                <Btn
                  label="Retirer"
                  variant="ghost"
                  compact
                  onPress={() => {
                    void discardCapture(image.uri);
                    setImage(null);
                  }}
                />
              </View>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label="Capture" icon="images-outline" variant="secondary" compact onPress={pickImage} style={{ flex: 1 }} />
            <Btn label="Photo" icon="camera-outline" variant="secondary" compact onPress={takePhoto} style={{ flex: 1 }} />
          </View>
          <Btn
            label={loading ? 'Analyse en cours…' : 'Analyser avec SEYLI'}
            icon="sparkles"
            onPress={runAnalysis}
            loading={loading}
          />
        </BentoPanel>

        {analysis ? (
          <>
            {fallbackNotice ? (
              <Note icon="cloud-offline-outline" tone="error">
                Ta clé API n’a pas pu être utilisée : le résultat ci-dessous vient de l’analyse
                locale. Vérifie ta clé dans Réglages → Clé API IA.
              </Note>
            ) : null}

            <BentoPanel style={{ borderColor: color + '66' }} contentStyle={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: color,
                    }}
                  />
                  <AppText variant="title">Résultat</AppText>
                </View>
                <Badge
                  label={SEVERITIES.find((s) => s.key === analysis.severityLevel)?.label ?? analysis.severityLevel}
                  color={color}
                />
              </View>

              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="micro" color={palette.muted}>
                    SCORE DE RISQUE
                  </AppText>
                  <AppText variant="label" color={color}>
                    {analysis.toxicityScore}/100
                  </AppText>
                </View>
                <View style={{ height: 10, borderRadius: 5, backgroundColor: palette.surfaceAlt, overflow: 'hidden' }}>
                  <View
                    style={{
                      width: `${Math.max(2, analysis.toxicityScore)}%` as `${number}%`,
                      height: '100%',
                      backgroundColor: color,
                    }}
                  />
                </View>
              </View>

              <AppText variant="bodySm">{analysis.summary}</AppText>

              {analysis.harassmentTypes.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {analysis.harassmentTypes.map((item) => (
                    <Badge key={item} label={item} color={palette.primary} />
                  ))}
                </View>
              ) : null}

              {analysis.recommendedActions.length ? (
                <View style={{ gap: 6 }}>
                  <AppText variant="label">À faire maintenant</AppText>
                  {analysis.recommendedActions.map((action, index) => (
                    <View key={`${action}-${index}`} style={{ flexDirection: 'row', gap: 8 }}>
                      <AppText variant="bodySm" color={palette.primary}>
                        {index + 1}.
                      </AppText>
                      <AppText variant="bodySm" style={{ flex: 1 }}>
                        {action}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </BentoPanel>

            {analysis.suggestedReplies.length ? (
              <BentoPanel contentStyle={{ gap: 10 }}>
                <SectionTitle title="Réponses proposées" subtitle="Copie, adapte ou envoie quand tu seras prête." />
                {analysis.suggestedReplies.map((reply, index) => (
                  <View
                    key={`${reply.tone}-${index}`}
                    style={{
                      gap: 6,
                      padding: 12,
                      borderRadius: radius.md,
                      backgroundColor: palette.surfaceAlt,
                    }}
                  >
                    <AppText variant="micro" color={palette.tertiary}>
                      {reply.tone.toUpperCase()}
                    </AppText>
                    <AppText variant="bodySm">{reply.message}</AppText>
                    <Pressable
                      onPress={async () => {
                        const copied = await copyToClipboard(reply.message);
                        if (copied) void haptic();
                        else Alert.alert('Copie impossible', 'Le presse-papiers est indisponible.');
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
                    >
                      <Ionicons name="copy-outline" size={15} color={palette.primary} />
                      <AppText variant="micro" color={palette.primary}>
                        COPIER
                      </AppText>
                    </Pressable>
                  </View>
                ))}
              </BentoPanel>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn
                label="Archiver comme preuve"
                icon="lock-closed-outline"
                onPress={() => setArchiveOpen(true)}
                style={{ flex: 1 }}
              />
              <Btn
                label="Effacer"
                variant="ghost"
                onPress={() => {
                  void discardCapture(image?.uri);
                  setAnalysis(null);
                  setText('');
                  setImage(null);
                }}
              />
            </View>
          </>
        ) : (
          <BentoPanel tone="soft" contentStyle={{ gap: 8 }}>
            <AppText variant="label">Comment ça marche</AppText>
            {[
              'Colle le message ou choisis une capture d’écran.',
              'SEYLI évalue la gravité, les tactiques et le risque.',
              'Archive le résultat dans ton Coffre, verrouillé par biométrie.',
            ].map((line) => (
              <View key={line} style={{ flexDirection: 'row', gap: 8 }}>
                <Ionicons name="checkmark-circle-outline" size={17} color={palette.primary} />
                <AppText variant="caption" color={palette.muted} style={{ flex: 1 }}>
                  {line}
                </AppText>
              </View>
            ))}
          </BentoPanel>
        )}

        <BentoPanel contentStyle={{ gap: 8 }}>
          <SectionTitle title="Filtre SMS" subtitle="Analyse aussi tes messages entrants." />
          <Btn label="Ouvrir le filtre SMS" icon="chatbox-ellipses-outline" variant="secondary" onPress={() => nav.navigate('sms')} />
        </BentoPanel>
      </BentoScreen>

      <Sheet visible={archiveOpen} onClose={() => setArchiveOpen(false)} title="Archiver la preuve">
        <Field
          label="TITRE"
          value={title}
          onChangeText={setTitle}
          placeholder="Ex. Menaces en DM Instagram"
          maxLength={120}
        />
        <Field
          label="COMPTE / NUMÉRO DE L’AUTEUR (OPTIONNEL)"
          value={handle}
          onChangeText={setHandle}
          placeholder="@compte_anonyme ou +228…"
          maxLength={80}
        />
        <Field label="EXTRAIT / CONTEXTE" value={text} onChangeText={setText} multiline maxLength={2000} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SEVERITIES.map((s) => (
            <Chip
              key={s.key}
              label={s.label}
              active={analysis?.severityLevel === s.key}
              onPress={() => analysis && setAnalysis({ ...analysis, severityLevel: s.key })}
            />
          ))}
        </View>
        <Btn label="Enregistrer dans le Coffre" icon="lock-closed" onPress={archive} />
      </Sheet>
    </>
  );
}
