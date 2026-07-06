import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQueries } from '@tanstack/react-query';
import type { Trip } from '@samishan11/moto-contract';
import { EmptyState, Loading } from '../components/layout';
import { useNavigation } from '../navigation/Navigator';
import { useGroups } from '../api/queries';
import { tripsQueryOptions } from '../api/queries';
import { colors } from '../theme';

type Tab = 'upcoming' | 'past';

function dateLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Highlight tag for trips happening within a week. */
function tripTag(iso: string): string | null {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return 'TODAY';
  if (days === 1) return 'TOMORROW';
  if (days <= 7) return 'THIS WEEK';
  return null;
}

function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }): ReactNode {
  const tag = trip.myRsvp === 'GOING' ? "YOU'RE GOING" : tripTag(trip.scheduledAt);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={trip.title}
    >
      {/* Striped map-preview band (real map shown on detail) */}
      <View style={styles.thumb} />
      <View style={styles.cardBody}>
        <View style={styles.cardHead}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {trip.title}
            </Text>
            <Text style={styles.cardDate}>{dateLabel(trip.scheduledAt)}</Text>
          </View>
          {tag ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.metaRow}>
          {trip.location ? <Text style={styles.meta}>📍 {trip.location}</Text> : null}
          <Text style={styles.meta}>🧭 {trip.stopCount} stops</Text>
          <Text style={styles.metaGoing}>👥 {trip.rsvp.going} going</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function TripsScreen(): ReactNode {
  const nav = useNavigation();
  const groups = useGroups();
  const [tab, setTab] = useState<Tab>('upcoming');

  const groupIds = useMemo(() => (groups.data ?? []).map((g) => g.id), [groups.data]);

  // Aggregate trips across every group the user belongs to.
  const tripQueries = useQueries({
    queries: groupIds.map((gid) => tripsQueryOptions(gid, tab === 'upcoming')),
  });

  const loading = groups.isLoading || tripQueries.some((q) => q.isLoading);
  const trips = useMemo(() => {
    const all = tripQueries.flatMap((q) => q.data ?? []);
    return all.sort((a, b) =>
      tab === 'upcoming'
        ? a.scheduledAt.localeCompare(b.scheduledAt)
        : b.scheduledAt.localeCompare(a.scheduledAt),
    );
  }, [tripQueries, tab]);

  function handleCreate(): void {
    // Trips live inside a group; the form picks the group.
    nav.navigate('tripForm', {});
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Trips</Text>
        <Pressable
          style={styles.createButton}
          onPress={handleCreate}
          accessibilityRole="button"
          accessibilityLabel="Plan a trip"
        >
          <Text style={styles.createButtonText}>+</Text>
        </Pressable>
      </View>

      {/* Segmented tabs */}
      <View style={styles.segmented}>
        {(['upcoming', 'past'] as Tab[]).map((seg) => (
          <Pressable
            key={seg}
            style={[styles.segment, tab === seg && styles.segmentActive]}
            onPress={() => setTab(seg)}
          >
            <Text style={[styles.segmentText, tab === seg && styles.segmentTextActive]}>
              {seg === 'upcoming' ? 'Upcoming' : 'Past'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? <Loading /> : null}
      {!loading && trips.length === 0 ? (
        <EmptyState
          message={
            groupIds.length === 0
              ? 'Join a group to plan and see trips.'
              : tab === 'upcoming'
                ? 'No upcoming trips — plan one!'
                : 'No past trips yet.'
          }
        />
      ) : null}

      {trips.map((trip) => (
        <TripCard
          key={trip.id}
          trip={trip}
          onPress={() => nav.navigate('tripDetail', { id: trip.id, groupId: trip.groupId })}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  container: { flex: 1, backgroundColor: '#0A0B0D' },
  scroll: { paddingTop: 62, paddingHorizontal: 20, paddingBottom: 120 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#F2F3F5', letterSpacing: -0.52 },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FF5A1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: { fontSize: 22, fontWeight: '600', color: '#fff', lineHeight: 24 },

  segmented: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#15171C',
    padding: 4,
    borderRadius: 14,
    marginBottom: 22,
  },
  segment: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  segmentActive: { backgroundColor: '#2A2E37' },
  segmentText: { fontSize: 13, fontWeight: '600', color: '#9AA0AB' },
  segmentTextActive: { color: '#F2F3F5' },

  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#15171C',
    marginBottom: 14,
  },
  cardPressed: { opacity: 0.85 },
  thumb: {
    height: 96,
    backgroundColor: '#1c1f26',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  cardBody: { padding: 16 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#F2F3F5', letterSpacing: -0.2 },
  cardDate: { fontSize: 13, fontWeight: '500', color: '#9AA0AB', marginTop: 4 },
  tag: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,90,31,0.9)',
  },
  tagText: { fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', gap: 14, marginTop: 12, flexWrap: 'wrap' },
  meta: { fontSize: 12, fontWeight: '600', color: '#9AA0AB' },
  metaGoing: { fontSize: 12, fontWeight: '600', color: '#FF5A1F' },
});
