import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { SUPPORT_CENTERS } from '../data/static';
import { dial, openInMaps } from '../lib/emergency';
import { useNav } from '../navigation';
import { useApp } from '../store';
import { radius } from '../theme';
import { AppText, Badge, Btn, Chip, Field, IconTile, Note, SectionTitle } from '../ui/kit';
import { BentoPanel, BentoScreen } from '../ui/bento';

export default function MapScreen() {
  const { palette, state, addPlace, deletePlace } = useApp();
  const nav = useNav();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tous');

  const categories = useMemo(
    () => ['Tous', ...new Set(SUPPORT_CENTERS.map((c) => c.category))],
    []
  );

  const centers = useMemo(() => {
    const search = query.trim().toLowerCase();
    return SUPPORT_CENTERS.filter((center) => {
      const matchesCategory = category === 'Tous' || center.category === category;
      const matchesSearch =
        !search ||
        center.name.toLowerCase().includes(search) ||
        center.city.toLowerCase().includes(search) ||
        center.description.toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [query, category]);

  const isSaved = (id: string) => state.places.some((p) => p.id === id);

  return (
    <BentoScreen>
      <BentoPanel contentStyle={{ gap: 12 }}>
        <SectionTitle
          title="Lieux & ressources"
          subtitle="Structures d’aide gratuités au Togo, à portée de main."
        />
        <Field
          placeholder="Rechercher un lieu, une ville, un besoin…"
          value={query}
          onChangeText={setQuery}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((item) => (
            <Chip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />
          ))}
        </View>
        <Note>
          Chaque lieu s’ouvre dans Google Maps pour l’itinéraire.
        </Note>
      </BentoPanel>

      {centers.map((center) => (
        <BentoPanel key={center.id} contentStyle={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <IconTile name="location" size={44} />
            <View style={{ flex: 1, gap: 3 }}>
              <AppText variant="subtitle">{center.name}</AppText>
              <AppText variant="caption" color={palette.muted}>
                {center.address} • {center.city}
              </AppText>
              <AppText variant="bodySm">{center.description}</AppText>
            </View>
            <Badge label={center.category} color={palette.secondary} />
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label="Appeler" icon="call-outline" compact variant="secondary" onPress={() => dial(center.phone)} style={{ flex: 1 }} />
            <Btn
              label="Itinéraire"
              icon="navigate-outline"
              compact
              variant="ghost"
              onPress={() => openInMaps(center.latitude, center.longitude, center.name)}
              style={{ flex: 1 }}
            />
            <Pressable
              onPress={() => {
                if (isSaved(center.id)) {
                  deletePlace(center.id);
                  return;
                }
                addPlace(center);
              }}
              accessibilityRole="button"
              accessibilityLabel={isSaved(center.id) ? 'Retirer des lieux enregistrés' : 'Enregistrer ce lieu'}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isSaved(center.id) ? palette.primary : palette.surfaceAlt,
                borderWidth: isSaved(center.id) ? 0 : 1,
                borderColor: palette.hairline,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
                ...(isSaved(center.id)
                  ? {
                      shadowColor: palette.primaryDeep,
                      shadowOpacity: 0.28,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 4,
                    }
                  : {}),
              })}
            >
              <Ionicons
                name={isSaved(center.id) ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={isSaved(center.id) ? palette.onPrimary : palette.muted}
              />
            </Pressable>
          </View>
        </BentoPanel>
      ))}

      {centers.length === 0 ? (
        <BentoPanel tone="soft">
          <AppText variant="bodySm" color={palette.muted}>
            Aucun lieu ne correspond à cette recherche. Essaie « Lomé », « écoute » ou « signalement ».
          </AppText>
        </BentoPanel>
      ) : null}

      <BentoPanel contentStyle={{ gap: 10 }}>
        <SectionTitle title="Mes lieux enregistrés" subtitle="Accessibles même hors ligne." />
        {state.places.length === 0 ? (
          <AppText variant="caption" color={palette.muted}>
            Enregistre un lieu avec l’icône marque-page pour le retrouver rapidement.
          </AppText>
        ) : (
          state.places.map((place) => (
            <View key={place.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
              <IconTile name="bookmark" size={38} tone="neutral" color={palette.primary} />
              <View style={{ flex: 1 }}>
                <AppText variant="label" numberOfLines={1}>
                  {place.name}
                </AppText>
                <AppText variant="caption" color={palette.muted}>
                  {place.city}
                </AppText>
              </View>
              <Pressable
                onPress={() => openInMaps(place.latitude, place.longitude, place.name)}
                hitSlop={8}
                accessibilityLabel={`Itinéraire vers ${place.name}`}
              >
                <Ionicons name="navigate-outline" size={19} color={palette.primary} />
              </Pressable>
              <Pressable
                onPress={() =>
                  Alert.alert('Retirer ce lieu ?', place.name, [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Retirer', style: 'destructive', onPress: () => deletePlace(place.id) },
                  ])
                }
                hitSlop={8}
                accessibilityLabel={`Retirer ${place.name}`}
              >
                <Ionicons name="close-circle-outline" size={19} color={palette.muted} />
              </Pressable>
            </View>
          ))
        )}
      </BentoPanel>

      <BentoPanel tone="soft" contentStyle={{ gap: 8 }}>
        <AppText variant="label">Besoin d’une orientation personnalisée ?</AppText>
        <AppText variant="caption" color={palette.muted}>
          Le Coach SEYLI peut t’aider à choisir la bonne structure et préparer ce que tu vas dire.
        </AppText>
        <Btn
          label="Parler au Coach"
          icon="chatbubbles-outline"
          variant="secondary"
          onPress={() => nav.goTab('coach')}
          compact
        />
      </BentoPanel>
    </BentoScreen>
  );
}
