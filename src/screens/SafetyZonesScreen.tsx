import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, View } from 'react-native';
import { TOGO_ZONE_PRESETS } from '../data/static';
import { triggerSos } from '../lib/emergency';
import { useApp } from '../store';
import { radius, space } from '../theme';
import { AppText, Badge, BentoScreen, BentoPanel, BentoGrid, BentoRow, BentoChip, BentoBtn, BentoField, BentoToggle, BentoEmptyState } from '../ui/bento';
import { SafetyZone, ZONE_LABELS, ZoneRiskLevel } from '../types';

const EARTH_RADIUS = 6371000;

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

interface LiveStatus {
  zone: SafetyZone;
  distance: number;
  inside: boolean;
  dwellMinutes: number;
}

export default function SafetyZonesScreen() {
  const { palette, state, set, upsertZone, toggleZone, deleteZone, addCheckIn } = useApp();
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [risk, setRisk] = useState<ZoneRiskLevel>('HIGH_RISK');
  const [radiusMeters, setRadiusMeters] = useState(250);
  const [dwell, setDwell] = useState(10);
  const [preset, setPreset] = useState(TOGO_ZONE_PRESETS[0]);
  const [promptZone, setPromptZone] = useState<SafetyZone | null>(null);
  const [promptDwell, setPromptDwell] = useState(0);

  const enteredAt = useRef<Record<string, number>>({});
  const snoozedUntil = useRef<Record<string, number>>({});
  const prompted = useRef<Record<string, boolean>>({});

  useEffect(() => {
    let subscription: Location.LocationSubscription | undefined;
    let cancelled = false;
    (async () => {
      if (!state.monitoring) return;
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError('Autorisation de localisation refusée.');
        set('monitoring', false);
        return;
      }
      setLocationError(null);
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 25,
          timeInterval: 15000,
        },
        (position) => {
          if (!cancelled) {
            setCoords({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          }
        },
        (error) => {
          if (!cancelled) setLocationError(error);
        }
      );
    })().catch((error) => {
      setLocationError(error instanceof Error ? error.message : 'Localisation indisponible.');
    });
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [state.monitoring, set]);

  useEffect(() => {
    if (!coords || !state.monitoring) return;
    const now = Date.now();
    state.zones
      .filter((zone) => zone.enabled)
      .forEach((zone) => {
        const distance = distanceMeters(coords.latitude, coords.longitude, zone.latitude, zone.longitude);
        const inside = distance <= zone.radiusMeters;
        if (!inside) {
          delete enteredAt.current[zone.id];
          prompted.current[zone.id] = false;
          return;
        }
        if (!enteredAt.current[zone.id]) enteredAt.current[zone.id] = now;
        const dwellMs = now - (enteredAt.current[zone.id] ?? now);
        const thresholdMs = zone.dwellThresholdMinutes * 60_000;
        const snooze = snoozedUntil.current[zone.id] ?? 0;
        if (
          zone.riskLevel === 'HIGH_RISK' &&
          dwellMs >= thresholdMs &&
          now > snooze &&
          !prompted.current[zone.id] &&
          !promptZone
        ) {
          prompted.current[zone.id] = true;
          setPromptZone(zone);
          setPromptDwell(Math.max(zone.dwellThresholdMinutes, Math.floor(dwellMs / 60_000)));
        }
      });
  }, [coords, state.monitoring, state.zones, promptZone]);

  const live: LiveStatus[] = useMemo(() => {
    return state.zones.map((zone) => {
      const distance = coords
        ? distanceMeters(coords.latitude, coords.longitude, zone.latitude, zone.longitude)
        : Number.NaN;
      const inside = !!coords && distance <= zone.radiusMeters;
      const dwellMinutes =
        inside && enteredAt.current[zone.id]
          ? Math.max(0, Math.floor((Date.now() - enteredAt.current[zone.id]) / 60_000))
          : 0;
      return { zone, distance, inside, dwellMinutes };
    });
  }, [state.zones, coords]);

  const insideHighRisk = live.find((item) => item.inside && item.zone.riskLevel === 'HIGH_RISK');

  const saveZone = () => {
    if (!name.trim()) {
      Alert.alert('Nom requis', 'Donne un nom à cette zone.');
      return;
    }
    upsertZone({
      name: name.trim().slice(0, 80),
      riskLevel: risk,
      latitude: preset.latitude,
      longitude: preset.longitude,
      radiusMeters,
      dwellThresholdMinutes: dwell,
      note: '',
      enabled: true,
    });
    setName('');
    setAddOpen(false);
  };

  const closePrompt = (outcome: 'SAFE_CONFIRMED' | 'SNOOZED_10_MIN' | 'SOS_TRIGGERED') => {
    if (!promptZone) return;
    addCheckIn({
      zoneId: promptZone.id,
      zoneName: promptZone.name,
      riskLevel: promptZone.riskLevel,
      outcome,
      dwellMinutes: promptDwell,
    });
    if (outcome === 'SNOOZED_10_MIN') {
      snoozedUntil.current[promptZone.id] = Date.now() + 10 * 60_000;
    } else {
      snoozedUntil.current[promptZone.id] = Date.now() + promptZone.dwellThresholdMinutes * 60_000;
    }
    if (outcome === 'SOS_TRIGGERED') {
      triggerSos(state.contacts, state.alias);
    }
    enteredAt.current[promptZone.id] = Date.now();
    setPromptZone(null);
  };

  const colorForRisk = (riskLevel: ZoneRiskLevel) => {
    if (riskLevel === 'HIGH_RISK') return palette.error;
    if (riskLevel === 'CAUTION') return palette.severity.MODERATE;
    return palette.severity.LOW;
  };

  return (
    <BentoScreen>
      <BentoPanel tone="glass" style={{ gap: 12 }}>
        <AppText variant="h3">Zones de sécurité</AppText>
        <AppText variant="caption" color={palette.muted}>
          Check-in automatique si tu restes dans une zone à haut risque.
        </AppText>
      </BentoPanel>

      <BentoPanel style={{ gap: 12 }}>
        <BentoToggle
          icon="navigate-outline"
          title="Surveillance des zones"
          subtitle={
            state.monitoring
              ? coords
                ? `Suivi actif • ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
                : 'En attente du signal GPS…'
              : 'Active pour suivre tes déplacements dans l\'app.'
          }
          value={state.monitoring}
          onValueChange={(next) => {
            set('monitoring', next);
            if (!next) {
              enteredAt.current = {};
              prompted.current = {};
            }
          }}
        />
        {locationError ? (
          <AppText variant="caption" color={palette.error}>{locationError}</AppText>
        ) : null}
      </BentoPanel>

      <BentoPanel style={{ padding: 10, borderRadius: radius.md, backgroundColor: palette.surfaceAlt }}>
        <Ionicons name="information-circle-outline" size={18} color={palette.tertiary} />
        <AppText variant="caption" color={palette.muted} style={{ flex: 1 }}>
          Le suivi de ta position fonctionne quand l'application est ouverte. Il s'arrête quand tu la fermes.
        </AppText>
      </BentoPanel>

      {insideHighRisk ? (
        <BentoPanel style={{ padding: 10, borderRadius: radius.md, backgroundColor: palette.errorContainer }}>
          <Ionicons name="warning" size={18} color={palette.error} />
          <AppText variant="caption" color={palette.error} style={{ flex: 1 }}>
            Tu es dans « {insideHighRisk.zone.name} » (haut risque) depuis {insideHighRisk.dwellMinutes} min.
          </AppText>
        </BentoPanel>
      ) : null}

      <BentoBtn label="Ajouter une zone" icon="add-circle-outline" onPress={() => setAddOpen(true)} />

      {state.zones.length === 0 ? (
        <BentoEmptyState
          icon="map-outline"
          title="Aucune zone configurée"
          body="Ajoute ton lycée, un trajet ou un quartier à risque. SEYLI te proposera un check-in après un séjour prolongé."
          action={<BentoBtn label="Créer une zone" icon="add" onPress={() => setAddOpen(true)} />}
        />
      ) : (
        state.zones.map((zone) => {
          const status = live.find((item) => item.zone.id === zone.id);
          const color = colorForRisk(zone.riskLevel);
          return (
            <BentoPanel key={zone.id} style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="location" size={20} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="label">{zone.name}</AppText>
                  <AppText variant="caption" color={palette.muted}>
                    {zone.radiusMeters} m • check-in après {zone.dwellThresholdMinutes} min
                  </AppText>
                </View>
                <Badge label={ZONE_LABELS[zone.riskLevel]} color={color} />
              </View>

              {status && coords ? (
                <AppText variant="caption" color={status.inside ? color : palette.muted}>
                  {status.inside ? `À l'intérieur • ${status.dwellMinutes} min sur place` : `À ${formatDistance(status.distance)} de la zone`}
                </AppText>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <BentoBtn label={zone.enabled ? 'Désactiver' : 'Activer'} compact variant="ghost" onPress={() => toggleZone(zone.id, !zone.enabled)} />
                <BentoBtn label="Tester le check-in" compact variant="secondary" onPress={() => {
                  setPromptZone(zone);
                  setPromptDwell(zone.dwellThresholdMinutes);
                }} />
                <BentoBtn label="Supprimer" compact variant="ghost" onPress={() => {
                  Alert.alert('Supprimer cette zone ?', zone.name, [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Supprimer', style: 'destructive', onPress: () => deleteZone(zone.id) },
                  ]);
                }} />
              </View>

              <AppText variant="micro" color={palette.muted}>
                {zone.enabled ? 'SURVEILLANCE ACTIVE' : 'ZONE EN PAUSE'}
              </AppText>
            </BentoPanel>
          );
        })
      )}

      <BentoPanel style={{ gap: 10 }}>
        <AppText variant="h3">Historique des check-ins</AppText>
        <AppText variant="caption" color={palette.muted}>Tes confirmations et alertes récentes.</AppText>
      </BentoPanel>

      {state.checkIns.length === 0 ? (
        <AppText variant="caption" color={palette.muted}>Aucun check-in encore. Ils apparaîtront ici après chaque confirmation.</AppText>
      ) : (
        state.checkIns.slice(0, 6).map((record) => (
          <View key={record.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
            <Ionicons
              name={record.outcome === 'SOS_TRIGGERED' ? 'alert-circle' : record.outcome === 'SNOOZED_10_MIN' ? 'time-outline' : 'checkmark-circle'}
              size={18}
              color={record.outcome === 'SOS_TRIGGERED' ? palette.error : palette.severity.LOW}
            />
            <View style={{ flex: 1 }}>
              <AppText variant="caption">{record.zoneName}</AppText>
              <AppText variant="micro" color={palette.muted}>
                {new Date(record.timestamp).toLocaleString('fr-FR')} • {record.dwellMinutes} min
              </AppText>
            </View>
            <AppText variant="micro" color={palette.muted}>
              {record.outcome === 'SAFE_CONFIRMED' ? 'EN SÉCURITÉ' : record.outcome === 'SNOOZED_10_MIN' ? '+10 MIN' : 'SOS'}
            </AppText>
          </View>
        ))
      )}

      <BentoPanel style={{ gap: 10 }}>
        <AppText variant="label">Nouvelle zone de sécurité</AppText>
        <BentoField label="NOM DE LA ZONE" value={name} onChangeText={setName} placeholder="Ex. Lycée, trajet retour…" maxLength={80} />
        <AppText variant="micro" color={palette.muted}>EMPLACEMENT RAPIDE</AppText>
        <BentoRow style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TOGO_ZONE_PRESETS.map((item) => (
            <BentoChip key={item.label} label={item.label} active={preset.label === item.label} onPress={() => {
              setPreset(item);
              if (!name.trim()) setName(item.name);
            }} />
          ))}
        </BentoRow>
        <AppText variant="micro" color={palette.muted}>NIVEAU DE RISQUE</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(Object.keys(ZONE_LABELS) as ZoneRiskLevel[]).map((key) => (
            <BentoChip key={key} label={ZONE_LABELS[key]} active={risk === key} onPress={() => setRisk(key)} />
          ))}
        </View>
        <AppText variant="micro" color={palette.muted}>RAYON</AppText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[100, 250, 500, 1000].map((value) => (
            <BentoChip key={value} label={`${value} m`} active={radiusMeters === value} onPress={() => setRadiusMeters(value)} />
          ))}
        </View>
        <AppText variant="micro" color={palette.muted}>CHECK-IN APRÈS</AppText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[5, 10, 15, 30].map((value) => (
            <BentoChip key={value} label={`${value} min`} active={dwell === value} onPress={() => setDwell(value)} />
          ))}
        </View>
        <BentoBtn label="Créer la zone" icon="add" onPress={saveZone} />
      </BentoPanel>
    </BentoScreen>
  );
}