import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '../navigation/Navigator';
import { markPermissionsSetupDone } from '../lib/permissionsSetup';

type PermissionKey = 'location' | 'backgroundLocation' | 'notifications' | 'camera';

interface PermissionRow {
  key: PermissionKey;
  emoji: string;
  title: string;
  description: string;
  /** Icon tile tint while the permission is not yet granted. */
  tint: string;
}

const rows: PermissionRow[] = [
  {
    key: 'location',
    emoji: '📍',
    title: 'Location',
    description: 'Live navigation & group tracking',
    tint: 'rgba(48,209,88,0.14)',
  },
  {
    key: 'backgroundLocation',
    emoji: '🛰',
    title: 'Background Location',
    description: 'Keep sharing while phone is locked',
    tint: 'rgba(48,209,88,0.14)',
  },
  {
    key: 'notifications',
    emoji: '🔔',
    title: 'Notifications',
    description: 'Ride alerts, SOS, hazards',
    tint: 'rgba(46,139,255,0.14)',
  },
  {
    key: 'camera',
    emoji: '📷',
    title: 'Camera & Gallery',
    description: 'Report hazards, share ride photos',
    tint: 'rgba(191,90,242,0.14)',
  },
];

/** "Set up your ride" — one-time permission onboarding shown after sign-in. */
export function PermissionsScreen(): ReactNode {
  const nav = useNavigation();
  const [granted, setGranted] = useState<Record<PermissionKey, boolean>>({
    location: false,
    backgroundLocation: false,
    notifications: false,
    camera: false,
  });

  // Reflect permissions the OS has already granted (e.g. reinstall, web).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = { ...granted };
      try {
        next.location = (await Location.getForegroundPermissionsAsync()).granted;
      } catch { /* unsupported platform */ }
      try {
        next.backgroundLocation = (await Location.getBackgroundPermissionsAsync()).granted;
      } catch { /* background location unavailable on web */ }
      try {
        const cam = await ImagePicker.getCameraPermissionsAsync();
        const lib = await ImagePicker.getMediaLibraryPermissionsAsync();
        next.camera = cam.granted && lib.granted;
      } catch { /* unsupported platform */ }
      if (!cancelled) setGranted(next);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function request(key: PermissionKey): Promise<void> {
    try {
      switch (key) {
        case 'location': {
          const res = await Location.requestForegroundPermissionsAsync();
          setGranted((g) => ({ ...g, location: res.granted }));
          break;
        }
        case 'backgroundLocation': {
          // Background requires foreground first (iOS & Android).
          const fg = await Location.requestForegroundPermissionsAsync();
          if (!fg.granted) {
            setGranted((g) => ({ ...g, location: false }));
            return;
          }
          const bg = await Location.requestBackgroundPermissionsAsync();
          setGranted((g) => ({ ...g, location: true, backgroundLocation: bg.granted }));
          break;
        }
        case 'notifications': {
          // No expo-notifications dependency yet — record the rider's intent so
          // the real OS prompt can honor it once push notifications ship.
          setGranted((g) => ({ ...g, notifications: !g.notifications }));
          break;
        }
        case 'camera': {
          const cam = await ImagePicker.requestCameraPermissionsAsync();
          const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
          setGranted((g) => ({ ...g, camera: cam.granted && lib.granted }));
          break;
        }
      }
    } catch {
      // Permission API unavailable on this platform — leave the row off.
    }
  }

  async function onContinue(): Promise<void> {
    await markPermissionsSetupDone();
    nav.reset('home');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Set up your ride</Text>
      <Text style={styles.subtitle}>
        A few permissions keep you and your group safe on the road.
      </Text>

      {rows.map((row) => {
        const isOn = granted[row.key];
        return (
          <TouchableOpacity
            key={row.key}
            style={[styles.card, isOn ? styles.cardGranted : styles.cardDefault]}
            onPress={() => request(row.key)}
            disabled={isOn && row.key !== 'notifications'}
            accessibilityRole="button"
            accessibilityLabel={`${row.title}: ${isOn ? 'on' : 'off'}`}
            activeOpacity={0.7}
          >
            <View style={[styles.iconTile, { backgroundColor: isOn ? 'rgba(48,209,88,0.14)' : row.tint }]}>
              <Text style={styles.iconEmoji}>{row.emoji}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{row.title}</Text>
              <Text style={styles.cardDescription}>{row.description}</Text>
            </View>
            {isOn ? (
              <Text style={styles.onLabel}>✓ On</Text>
            ) : (
              <View style={styles.toggleTrack}>
                <View style={styles.toggleKnob} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={styles.continueButton}
        onPress={onContinue}
        accessibilityRole="button"
        accessibilityLabel="Continue"
      >
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B0D',
  },
  scrollContent: {
    paddingTop: 80,
    paddingHorizontal: 26,
    paddingBottom: 40,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F2F3F5',
    letterSpacing: -0.52,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9AA0AB',
    marginTop: 6,
    marginBottom: 26,
  },

  // Permission cards
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#15171C',
    borderWidth: 1,
    marginBottom: 12,
  },
  cardDefault: {
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardGranted: {
    borderColor: 'rgba(48,209,88,0.25)',
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 20,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F2F3F5',
  },
  cardDescription: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9AA0AB',
  },
  onLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#30D158',
  },
  toggleTrack: {
    width: 50,
    height: 30,
    borderRadius: 16,
    backgroundColor: '#2A2E37',
    position: 'relative',
  },
  toggleKnob: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },

  continueButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: '#FF5A1F',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 26,
    elevation: 8,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
