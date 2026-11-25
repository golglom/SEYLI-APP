import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useApp } from '../store';
import { AppText, Btn, Card, Divider, Field, Screen, SectionTitle, Sheet, ToggleRow } from '../ui/kit';

export default function PrivacyScreen() {
  const { palette, state, set, patch, savePin, clearPin } = useApp();
  const [alias, setAlias] = useState(state.alias);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  const regenerateSession = () => {
    const hex = Array.from({ length: 8 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');
    set('sessionId', `TG-${hex.slice(0, 4)}-${hex.slice(4, 8)}`);
  };

  const storePin = async () => {
    if (pin !== pinConfirm) {
      Alert.alert('Code différent', 'Les deux codes ne correspondent pas.');
      return;
    }
    let ok = false;
    try {
      ok = await savePin(pin);
    } catch {
      Alert.alert('Chiffrement indisponible', "Impossible d'enregistrer le code pour le moment. Relance l'application puis réessaie.");
      return;
    }
    if (!ok) {
      Alert.alert('Code invalide', 'Choisis 4 à 8 chiffres.');
      return;
    }
    setPin('');
    setPinConfirm('');
    setPinOpen(false);
    Alert.alert('Code enregistré', 'Il permet de déverrouiller le Coffre si la biométrie échoue.');
  };

  return (
    <>
      <Screen>
        <Card style={{ gap: 12 }}>
          <SectionTitle
            title="Identité anonyme"
            subtitle="Aucun email, aucun compte. Un pseudonyme et un identifiant de session."
          />
          <Field label="PSEUDONYME" value={alias} onChangeText={setAlias} maxLength={40} />
          <Btn
            label="Enregistrer le pseudonyme"
            icon="checkmark"
            variant="secondary"
            onPress={() => {
              set('alias', alias.trim().slice(0, 40) || 'Anonyme');
              Alert.alert('Pseudonyme mis à jour');
            }}
          />
          <Divider />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="micro" color={palette.muted}>
                IDENTIFIANT DE SESSION
              </AppText>
              <AppText variant="mono" color={palette.primary}>
                {state.sessionId}
              </AppText>
            </View>
            <Btn label="Régénérer" compact variant="ghost" onPress={regenerateSession} />
          </View>
        </Card>

        <Card style={{ gap: 4 }}>
          <SectionTitle title="Protection des aperçus" />
          <ToggleRow
            icon="eye-off-outline"
            title="Masquer les aperçus sensibles"
            subtitle="Les preuves n’affichent plus le contenu dans les listes."
            value={state.hidePreviews}
            onValueChange={(next) => set('hidePreviews', next)}
          />
          <ToggleRow
            icon="finger-print-outline"
            title="Verrou biométrique du Coffre"
            subtitle="Empreinte ou visage à l’ouverture de l’onglet Preuves."
            value={state.biometricLock}
            onValueChange={(next) => set('biometricLock', next)}
          />
          <ToggleRow
            icon="phone-portrait-outline"
            title="Masquer réseau et appareil"
            subtitle="Infos de session affichées en mode confidentiel."
            value={state.maskDeviceInfo}
            onValueChange={(next) => set('maskDeviceInfo', next)}
          />
          <ToggleRow
            icon="camera-outline"
            title="Captures incognito"
            subtitle="Natif Android uniquement — indisponible dans Expo Go."
            value={state.incognitoScreenshots}
            onValueChange={(next) => {
              set('incognitoScreenshots', next);
              if (next) {
                Alert.alert(
                  'Fonction native',
                  'Empêcher la notification système de capture nécessite FLAG_SECURE sur Android natif. Expo Go ne peut pas l’activer, l’option reste donc symbolique ici.'
                );
              }
            }}
          />
        </Card>

        <Card style={{ gap: 10 }}>
          <SectionTitle
            title="Code de secours du Coffre"
            subtitle="4 à 8 chiffres, stocké sous forme de hash salé."
          />
          {state.pinHash ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={18} color={palette.severity.LOW} />
                <AppText variant="caption">Un code de secours est configuré.</AppText>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn
                  label="Changer le code"
                  variant="secondary"
                  compact
                  onPress={() => setPinOpen(true)}
                  style={{ flex: 1 }}
                />
                <Btn
                  label="Supprimer"
                  variant="ghost"
                  compact
                  onPress={() =>
                    Alert.alert('Supprimer le code ?', 'La biométrie restera disponible.', [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Supprimer', style: 'destructive', onPress: clearPin },
                    ])
                  }
                />
              </View>
            </>
          ) : (
            <Btn label="Configurer un code" icon="key-outline" onPress={() => setPinOpen(true)} />
          )}
        </Card>

        <Card style={{ gap: 8 }}>
          <SectionTitle title="Limites Expo Go" />
          {[
            'L’interception des SMS entrants n’est pas possible dans Expo Go.',
            'La localisation en arrière-plan s’arrête quand l’app est fermée.',
            'La capture d’écran incognito nécessite du code natif Android.',
            'Face ID n’est pas disponible dans Expo Go sur iPhone : une development build est nécessaire.',
            'La connexion Google et Firebase natif ne sont pas inclus dans ce portage.',
          ].map((line) => (
            <View key={line} style={{ flexDirection: 'row', gap: 8 }}>
              <Ionicons name="information-circle-outline" size={17} color={palette.tertiary} />
              <AppText variant="caption" color={palette.muted} style={{ flex: 1 }}>
                {line}
              </AppText>
            </View>
          ))}
        </Card>

        <Card tone="alt" style={{ gap: 8 }}>
          <AppText variant="label">Réinitialiser le profil anonyme</AppText>
          <AppText variant="caption" color={palette.muted}>
            Nouveau pseudonyme, nouvel identifiant, options de confidentialité par défaut. Les preuves sont
            conservées.
          </AppText>
          <Btn
            label="Réinitialiser le profil"
            variant="ghost"
            compact
            onPress={() =>
              Alert.alert('Réinitialiser ?', 'Les preuves et contacts restent enregistrés.', [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Réinitialiser',
                  onPress: () => {
                    const hex = Array.from({ length: 8 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');
                    patch({
                      alias: 'Anonyme',
                      sessionId: `TG-${hex.slice(0, 4)}-${hex.slice(4, 8)}`,
                      maskDeviceInfo: false,
                      hidePreviews: false,
                      biometricLock: true,
                      incognitoScreenshots: false,
                      pinHash: null,
                      pinSalt: null,
                    });
                  },
                },
              ])
            }
          />
        </Card>
      </Screen>

      <Sheet visible={pinOpen} onClose={() => setPinOpen(false)} title="Code de secours">
        <Field
          label="NOUVEAU CODE (4 À 8 CHIFFRES)"
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={8}
          placeholder="••••"
        />
        <Field
          label="CONFIRMER LE CODE"
          value={pinConfirm}
          onChangeText={setPinConfirm}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={8}
          placeholder="••••"
        />
        <Btn label="Enregistrer le code" icon="key-outline" onPress={storePin} />
      </Sheet>
    </>
  );
}
