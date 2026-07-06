import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Loading } from '../components/layout';
import { useNavigation } from '../navigation/Navigator';
import { useRideStats } from '../api/queries';
import { colors } from '../theme';

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function RideStatsScreen(): ReactNode {
  const nav = useNavigation();
  const id = typeof nav.params.id === 'string' ? nav.params.id : '';
  const stats = useRideStats(id);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>🏁</Text>
        <Text style={styles.heroTitle}>Ride complete</Text>
        <Text style={styles.heroSub}>Nice work out there.</Text>
      </View>

      {stats.isLoading ? <Loading /> : null}

      {stats.data ? (
        <>
          <View style={styles.grid}>
            <Big value={`${stats.data.distanceKm}`} unit="km" label="Distance" color="#FF5A1F" />
            <Big value={fmtDuration(stats.data.durationSeconds)} label="Duration" color="#2E8BFF" />
          </View>
          <View style={styles.grid}>
            <Big value={`${stats.data.avgSpeedKph}`} unit="km/h" label="Avg speed" color="#30D158" />
            <Big value={`${stats.data.maxSpeedKph}`} unit="km/h" label="Top speed" color="#FF9F0A" />
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaText}>
              👥 {stats.data.participantCount}{' '}
              {stats.data.participantCount === 1 ? 'rider' : 'riders'} joined this ride
            </Text>
          </View>
        </>
      ) : null}

      <Pressable style={styles.doneBtn} onPress={() => nav.reset('home')}>
        <Text style={styles.doneText}>Done</Text>
      </Pressable>
    </ScrollView>
  );
}

function Big({
  value,
  unit,
  label,
  color,
}: {
  value: string;
  unit?: string;
  label: string;
  color: string;
}): ReactNode {
  return (
    <View style={styles.bigCard}>
      <View style={styles.bigValueRow}>
        <Text style={[styles.bigValue, { color }]}>{value}</Text>
        {unit ? <Text style={styles.bigUnit}>{unit}</Text> : null}
      </View>
      <Text style={styles.bigLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingTop: 80, paddingHorizontal: 20, paddingBottom: 40 },

  hero: { alignItems: 'center', marginBottom: 28 },
  heroIcon: { fontSize: 48 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 12, letterSpacing: -0.5 },
  heroSub: { fontSize: 14, color: colors.muted, marginTop: 4 },

  grid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  bigCard: {
    flex: 1,
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  bigValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  bigValue: { fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  bigUnit: { fontSize: 14, fontWeight: '600', color: colors.muted },
  bigLabel: { fontSize: 12, fontWeight: '500', color: colors.muted, marginTop: 4 },

  metaCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginTop: 8,
  },
  metaText: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' },

  doneBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  doneText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
