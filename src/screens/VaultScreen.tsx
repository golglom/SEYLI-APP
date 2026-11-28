import React, { useMemo, useState } from 'react';
import { Alert, Image, View } from 'react-native';
import { shareText } from '../lib/emergency';
import { copyToClipboard, haptic } from '../lib/native';
import { useApp } from '../store';
import { radius } from '../theme';
import { AppText, Badge, Btn, Card, Chip, Divider, EmptyState, Field, IconTile, SectionTitle, Sheet } from '../ui/kit';
import { BentoPanel, BentoScreen } from '../ui/bento';
import {
  Evidence,
  EvidenceStatus,
  PLATFORMS,
  SEVERITIES,
  STATUSES,
  SeverityLevel,
  SocialPlatform,
} from '../types';

const platformLabel = (key: SocialPlatform) =>
  PLATFORMS.find((p) => p.key === key)?.label ?? key;

const severityLabel = (key: SeverityLevel) =>
  SEVERITIES.find((s) => s.key === key)?.label ?? key;

const statusLabel = (key: EvidenceStatus) =>
  STATUSES.find((s) => s.key === key)?.label ?? key;

export default function VaultScreen() {
  const { palette, state, addEvidence, updateEvidence, deleteEvidence, verifyPin } = useApp();
  const [unlocked, setUnlocked] = useState(!state.biometricLock);
  const [pin, setPin] = useState('');
  const [filter, setFilter] = useState<'ALL' | SeverityLevel>('ALL');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Evidence | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState<SocialPlatform>('WHATSAPP');
  const [handle, setHandle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('MODERATE');

  const evidences = useMemo(() => {
    return state.evidences.filter((ev) => {
      const matchesSeverity = filter === 'ALL' || ev.severity === filter;
      const search = query.trim().toLowerCase();
      const matchesQuery =
        !search ||
        ev.title.toLowerCase().includes(search) ||
        ev.contentExcerpt.toLowerCase().includes(search) ||
        ev.perpetratorHandle.toLowerCase().includes(search);
      return matchesSeverity && matchesQuery;
    });
  }, [state.evidences, filter, query]);

  const unlock = async () => {
    if (state.biometricLock) {
      let prompted = false;
      try {
        const LocalAuthentication = await import('expo-local-authentication');
        if ((await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync())) {
          prompted = true;
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Déverrouiller le Coffre SEYLI',
            cancelLabel: 'Annuler',
            // Keep the system passcode out of the vault: the fallback is the SEYLI PIN below.
            disableDeviceFallback: true,
          });
          if (result.success) {
            setUnlocked(true);
            return;
          }
        }
      } catch {
        // Biometrics unavailable: fall through to the SEYLI PIN below.
      }
      if (!prompted && !state.pinHash) {
        // No usable biometrics and no fallback code yet: don't lock the user out.
        setUnlocked(true);
        return;
      }
    }
    if (state.pinHash) {
      let ok = false;
      try {
        ok = await verifyPin(pin);
      } catch {
        Alert.alert('Chiffrement indisponible', "La vérification du code n'a pas pu aboutir. Relance l'application puis réessaie.");
        return;
      }
      if (ok) {
        setPin('');
        setUnlocked(true);
        return;
      }
    }
    Alert.alert(
      'Coffre verrouillé',
      state.pinHash
        ? 'Biométrie ou code incorrect. Tu peux réessayer.'
        : 'Déverrouille par biométrie, ou ajoute un code depuis Confidentialité.'
    );
  };

  const buildDossier = (items: Evidence[]) =>
    [
      'SEYLI — DOSSIER DE PREUVES',
      `Généré le ${new Date().toLocaleString('fr-FR')}`,
      `Nombre de preuves : ${items.length}`,
      '',
      ...items.flatMap((ev, index) => [
        `${index + 1}. ${ev.title}`,
        `Plateforme : ${platformLabel(ev.platform)} • Gravité : ${severityLabel(ev.severity)} • Statut : ${statusLabel(ev.status)}`,
        ev.perpetratorHandle ? `Auteur : ${ev.perpetratorHandle}` : '',
        `Date : ${new Date(ev.createdAt).toLocaleString('fr-FR')}`,
        `Contenu : ${ev.contentExcerpt}`,
        ev.aiSummary ? `Analyse : ${ev.aiSummary}` : '',
        '',
      ]),
      'Assistance Togo : Allô 1011 (24h/24) • ANCy : +228 97 52 58 58',
    ]
      .filter(Boolean)
      .join('\n');

  const saveNew = () => {
    if (!title.trim() || !excerpt.trim()) {
      Alert.alert('Champs requis', 'Renseigne un titre et une description.');
      return;
    }
    addEvidence({
      title: title.trim().slice(0, 120),
      platform,
      perpetratorHandle: handle.trim().slice(0, 80),
      contentExcerpt: excerpt.trim().slice(0, 2000),
      severity,
      categories: [],
      status: 'ARCHIVED',
    });
    setTitle('');
    setHandle('');
    setExcerpt('');
    setSeverity('MODERATE');
    setAddOpen(false);
    void haptic('success');
  };

  if (state.biometricLock && !unlocked) {
    return (
      <BentoScreen>
        <BentoPanel contentStyle={{ alignItems: 'center', gap: 16, paddingVertical: 44 }}>
          <IconTile name="lock-closed" size={76} />
          <AppText variant="h3">Coffre verrouillé</AppText>
          <AppText variant="bodySm" color={palette.muted} style={{ textAlign: 'center', maxWidth: 280 }}>
            Tes preuves sont protégées. Déverrouille avec ta biométrie ou ton code SEYLI.
          </AppText>
          <Btn label="Déverrouiller" icon="finger-print" onPress={unlock} style={{ width: '100%' }} />
          {state.pinHash ? (
            <Field
              label="CODE DE SECOURS"
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              placeholder="••••"
              style={{ width: '100%' }}
            />
          ) : null}
        </BentoPanel>
      </BentoScreen>
    );
  }

  return (
    <>
      <BentoScreen>
        <BentoPanel contentStyle={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconTile name="shield-checkmark" size={44} />
            <View style={{ flex: 1 }}>
              <AppText variant="title">Coffre de preuves</AppText>
              <AppText variant="caption" color={palette.muted}>
                {state.evidences.length} preuve(s) • stockage local
              </AppText>
            </View>
            <Btn label="Ajouter" icon="add" compact onPress={() => setAddOpen(true)} />
          </View>
          <Field placeholder="Rechercher une preuve, un compte…" value={query} onChangeText={setQuery} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip label="Toutes" active={filter === 'ALL'} onPress={() => setFilter('ALL')} />
            {SEVERITIES.map((s) => (
              <Chip key={s.key} label={s.label} active={filter === s.key} onPress={() => setFilter(s.key)} />
            ))}
          </View>
        </BentoPanel>

        {evidences.length === 0 ? (
          <BentoPanel style={{ alignItems: 'center' }}>
            <EmptyState
              icon="lock-open-outline"
              title="Ton coffre est vide"
              body="Analyse un message ou ajoute une preuve manuellement. Elle restera sur ton téléphone."
              action={<Btn label="Ajouter une preuve" icon="add" onPress={() => setAddOpen(true)} />}
            />
          </BentoPanel>
        ) : (
          evidences.map((ev) => (
            <BentoPanel
              key={ev.id}
              onPress={() => {
                setSelected(ev);
                setNotes(ev.notes ?? '');
              }}
              accessibilityLabel={`Ouvrir la preuve ${ev.title}`}
              contentStyle={{ gap: 10 }}
            >
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Badge
                    label={SEVERITIES.find((s) => s.key === ev.severity)?.label ?? ev.severity}
                    color={palette.severity[ev.severity]}
                  />
                  <Badge
                    label={STATUSES.find((s) => s.key === ev.status)?.label ?? ev.status}
                    color={ev.status === 'ARCHIVED' ? palette.muted : palette.primary}
                  />
                  <View style={{ flex: 1 }} />
                  <AppText variant="micro" color={palette.muted}>
                    {platformLabel(ev.platform)}
                  </AppText>
                </View>
                <AppText variant="subtitle" numberOfLines={2}>
                  {ev.title}
                </AppText>
                {!state.hidePreviews ? (
                  <AppText variant="bodySm" color={palette.muted} numberOfLines={2}>
                    {ev.contentExcerpt}
                  </AppText>
                ) : (
                  <AppText variant="caption" color={palette.muted}>
                    Aperçu masqué (confidentialité)
                  </AppText>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText variant="micro" color={palette.muted}>
                    {new Date(ev.createdAt).toLocaleDateString('fr-FR')} · {new Date(ev.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </AppText>
                  {ev.urgencyScore != null ? (
                    <AppText variant="micro" color={palette.severity[ev.severity]}>
                      URGENCE {ev.urgencyScore}/100
                    </AppText>
                  ) : null}
                </View>
            </BentoPanel>
          ))
        )}

        {state.evidences.length ? (
          <Btn
            label="Exporter le dossier complet"
            icon="share-outline"
            variant="secondary"
            onPress={() => shareText('Dossier SEYLI', buildDossier(state.evidences))}
          />
        ) : null}
      </BentoScreen>

      <Sheet visible={addOpen} onClose={() => setAddOpen(false)} title="Nouvelle preuve">
        <Field label="TITRE" value={title} onChangeText={setTitle} maxLength={120} placeholder="Ex. Insultes répétées sur TikTok" />
        <AppText variant="micro" color={palette.muted}>
          PLATEFORME
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PLATFORMS.map((p) => (
            <Chip key={p.key} label={p.label} active={platform === p.key} onPress={() => setPlatform(p.key)} />
          ))}
        </View>
        <Field
          label="COMPTE / NUMÉRO DE L’AUTEUR"
          value={handle}
          onChangeText={setHandle}
          maxLength={80}
          placeholder="@compte ou +228…"
        />
        <Field
          label="MESSAGE OU DESCRIPTION"
          value={excerpt}
          onChangeText={setExcerpt}
          multiline
          maxLength={2000}
          placeholder="Copie le message reçu ou décris les faits…"
        />
        <AppText variant="micro" color={palette.muted}>
          GRAVITÉ
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SEVERITIES.map((s) => (
            <Chip key={s.key} label={s.label} active={severity === s.key} onPress={() => setSeverity(s.key)} />
          ))}
        </View>
        <Btn label="Enregistrer" icon="save-outline" onPress={saveNew} />
      </Sheet>

      <Sheet visible={!!selected} onClose={() => setSelected(null)} title="Détail de la preuve">
        {selected ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Badge
                label={SEVERITIES.find((s) => s.key === selected.severity)?.label ?? selected.severity}
                color={palette.severity[selected.severity]}
              />
              <Badge label={platformLabel(selected.platform)} color={palette.secondary} />
              {selected.urgencyScore != null ? (
                <Badge label={`Urgence ${selected.urgencyScore}/100`} color={palette.error} />
              ) : null}
            </View>
            <AppText variant="h3">{selected.title}</AppText>
            <AppText variant="caption" color={palette.muted}>
              {new Date(selected.createdAt).toLocaleString('fr-FR')}
              {selected.perpetratorHandle ? ` • ${selected.perpetratorHandle}` : ''}
            </AppText>
            {selected.screenshotUri && !state.hidePreviews ? (
              <Image
                source={{ uri: selected.screenshotUri }}
                style={{ width: '100%', height: 180, borderRadius: radius.md }}
                resizeMode="cover"
              />
            ) : null}
            <AppText variant="bodySm">{selected.contentExcerpt}</AppText>
            {selected.aiSummary ? (
              <Card tone="alt" style={{ gap: 6 }}>
                <AppText variant="micro" color={palette.tertiary}>
                  ANALYSE SEYLI
                </AppText>
                <AppText variant="caption">{selected.aiSummary}</AppText>
              </Card>
            ) : null}
            {selected.detectedKeywords?.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {selected.detectedKeywords.map((keyword) => (
                  <Badge key={keyword} label={keyword} color={palette.muted} />
                ))}
              </View>
            ) : null}
            <Divider />
            <AppText variant="micro" color={palette.muted}>
              STATUT
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {STATUSES.map((s) => (
                <Chip
                  key={s.key}
                  label={s.label}
                  active={selected.status === s.key}
                  onPress={() => {
                    updateEvidence(selected.id, { status: s.key });
                    setSelected({ ...selected, status: s.key });
                  }}
                />
              ))}
            </View>
            <Field label="NOTES" value={notes} onChangeText={setNotes} multiline maxLength={1000} />
            <Btn
              label="Enregistrer les notes"
              icon="save-outline"
              variant="secondary"
              onPress={() => {
                updateEvidence(selected.id, { notes: notes.trim() || undefined });
                setSelected(null);
              }}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn
                label="Partager"
                icon="share-outline"
                variant="ghost"
                compact
                onPress={() => shareText(selected.title, buildDossier([selected]))}
                style={{ flex: 1 }}
              />
              <Btn
                label="Copier"
                icon="copy-outline"
                variant="ghost"
                compact
                onPress={async () => {
                  const copied = await copyToClipboard(buildDossier([selected]));
                  Alert.alert(
                    copied ? 'Copié' : 'Copie impossible',
                    copied
                      ? 'Le dossier est dans le presse-papiers.'
                      : 'Le presse-papiers est indisponible sur cet appareil.'
                  );
                }}
                style={{ flex: 1 }}
              />
            </View>
            <Btn
              label="Supprimer cette preuve"
              icon="trash-outline"
              variant="danger"
              onPress={() =>
                Alert.alert('Supprimer la preuve ?', 'Cette action est définitive.', [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: () => {
                      deleteEvidence(selected.id);
                      setSelected(null);
                    },
                  },
                ])
              }
            />
          </>
        ) : null}
      </Sheet>
    </>
  );
}
