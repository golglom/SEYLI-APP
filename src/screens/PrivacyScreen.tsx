import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useApp } from '../store';
import { setSecureScreen } from '../../modules/seyli-sms/src';
import { radius } from '../theme';
import { AppText, BentoScreen, BentoPanel, BentoGrid, BentoRow, BentoChip, BentoToggle, BentoField, BentoBtn } from '../ui/bento';

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
    <BentoScreen>
      <BentoPanel tone="glass" style={{ gap: 12 }}>
        <AppText variant="h3">Identité anonyme</AppText>
        <AppText variant="caption" color={palette.muted}>
          Aucun email, aucun compte. Un pseudonyme et un identifiant de session.
        </AppText>
      </BentoPanel>

      <BentoPanel style={{ gap: 12 }}>
        <BentoField label="PSEUDONYME" value={alias} onChangeText={setAlias} maxLength={40} />
        <BentoBtn label="Enregistrer le pseudonyme" icon="checkmark" variant="secondary" onPress={() => {
          set('alias', alias.trim().slice(0, 40) || 'Anonyme');
          Alert.alert('Pseudonyme mis à jour');
        }} />
      </BentoPanel>

      <BentoPanel style={{ gap: 4 }}>
        <AppText variant="h3">Protection des aperçus</AppText>
      </BentoPanel>

      <BentoRow style={{ gap: 8, marginTop: 4 }}>
        <BentoToggle
          icon="eye-off-outline"
          title="Masquer les aperçus sensibles"
          subtitle="Les preuves n'affichent plus le contenu dans les listes."
          value={state.hidePreviews}
          onValueChange={(next) => set('hidePreviews', next)}
        />
        <BentoToggle
          icon="finger-print-outline"
          title="Verrou biométrique du Coffre"
          subtitle="Empreinte ou visage à l'ouverture de l'onglet Preuves."
          value={state.biometricLock}
          onValueChange={(next) => set('biometricLock', next)}
        />
        <BentoToggle
          icon="phone-portrait-outline"
          title="Masquer réseau et appareil"
          subtitle="Infos de session affichées en mode confidentiel."
          value={state.maskDeviceInfo}
          onValueChange={(next) => set('maskDeviceInfo', next)}
        />
        <BentoToggle
          icon="camera-outline"
          title="Captures incognito"
          subtitle="Bloque les captures et l'enregistrement de l'écran."
          value={state.incognitoScreenshots}
          onValueChange={(next) => {
            set('incognitoScreenshots', next);
            // Applique tout de suite le drapeau : l'effet global ne se déclenche
            // qu'au prochain rendu et l'utilisatrice doit voir l'effet immédiat.
            setSecureScreen(next);
          }}
        />
      </BentoRow>

      <BentoPanel style={{ gap: 10 }}>
        <AppText variant="h3">Code de secours du Coffre</AppText>
        {state.pinHash ? (
          <BentoRow style={{ gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="checkmark-circle" size={18} color={palette.severity.LOW} />
            <AppText variant="caption">Un code de secours est configuré.</AppText>
          </BentoRow>
        ) : (
          <BentoBtn label="Configurer un code" icon="key-outline" onPress={() => setPinOpen(true)} />
        )}

        <BentoPanel style={{ gap: 8 }}>
          <AppText variant="label">À savoir</AppText>
          {["Le suivi de position s'arrête quand l'application est fermée.", "Les preuves restent sur ce téléphone : rien n'est envoyé sans ton accord.", "La clé API IA est stockée ici et ne part que vers Google, pour les analyses que tu lances."].map((line) => (
            <View key={line} style={{ flexDirection: 'row', gap: 8 }}>
              <Ionicons name="information-circle-outline" size={17} color={palette.tertiary} />
              <AppText variant="caption" color={palette.muted} style={{ flex: 1 }}>{line}</AppText>
            </View>
          ))}
        </BentoPanel>

      </BentoPanel>

      <BentoPanel tone="alt" style={{ gap: 8 }}>
        <AppText variant="label">Réinitialiser le profil anonyme</AppText>
        <AppText variant="caption" color={palette.muted}>
          Nouveau pseudonyme, nouvel identifiant, options de confidentialité par défaut. Les preuves sont conservées.
        </AppText>
        <BentoBtn label="Réinitialiser le profil" variant="ghost" compact onPress={() => {
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
          ]);
        }} />
      </BentoPanel>

      <BentoPanel tone="alt" style={{ gap: 8 }}>
        <AppText variant="label">Code de secours</AppText>
        <BentoField label="NOUVEAU CODE (4 À 8 CHIFFRES)" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={8} placeholder="••••" />
        <BentoField label="CONFIRMER LE CODE" value={pinConfirm} onChangeText={setPinConfirm} keyboardType="number-pad" secureTextEntry maxLength={8} placeholder="••••" />
        <BentoBtn label="Enregistrer le code" icon="key-outline" onPress={storePin} />
      </BentoPanel>
    </BentoScreen>
  );
}