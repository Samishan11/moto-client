import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Circle } from 'react-native-svg';
import { useNavigation } from '../navigation/Navigator';

export function TripsScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const [activeTab, setActiveTab] = useState('upcoming');

  const trips = [
    {
      id: 1,
      title: 'Alpine Pass Loop',
      date: 'Sat · 7:00 AM',
      distance: '248 km',
      duration: '~5h',
      participants: 12,
      tag: 'THIS SATURDAY',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Trips</Text>
        <TouchableOpacity style={styles.createButton}>
          <Text style={styles.createButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>Past</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'drafts' && styles.tabActive]}
          onPress={() => setActiveTab('drafts')}
        >
          <Text style={[styles.tabText, activeTab === 'drafts' && styles.tabTextActive]}>
            Drafts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Trip Cards */}
      {trips.map((trip) => (
        <TouchableOpacity key={trip.id} style={styles.tripCard}>
          {/* Thumbnail with SVG */}
          <View style={styles.thumbnail}>
            <Svg height="100%" width="100%" viewBox="0 0 350 150" preserveAspectRatio="none">
              <Path
                d="M-10 120 C60 90 90 40 160 55 S280 30 360 10"
                stroke="#FF5A1F"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            </Svg>
          </View>

          {/* Content */}
          <View style={styles.tripContent}>
            <View style={styles.tripHeader}>
              <View>
                <Text style={styles.tripTitle}>{trip.title}</Text>
                <Text style={styles.tripDate}>{trip.date}</Text>
              </View>
              <View style={styles.tripTag}>
                <Text style={styles.tripTagText}>{trip.tag}</Text>
              </View>
            </View>

            {/* Details */}
            <View style={styles.tripDetails}>
              <Text style={styles.tripDetail}>📍 {trip.distance}</Text>
              <Text style={styles.tripDetail}>⏱ {trip.duration}</Text>
              <Text style={[styles.tripDetail, styles.tripDetailHighlight]}>👥 {trip.participants}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B0D',
  },
  scrollContent: {
    paddingTop: 62,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F2F3F5',
    letterSpacing: -0.52,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FF5A1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 0,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 22,
    backgroundColor: '#15171C',
    padding: 4,
    borderRadius: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#2A2E37',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9AA0AB',
  },
  tabTextActive: {
    color: '#F2F3F5',
  },

  // Trip Card
  tripCard: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#15171C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 14,
  },
  thumbnail: {
    height: 180,
    backgroundColor: 'rgba(58, 42, 26, 0.5)',
    overflow: 'hidden',
  },
  tripContent: {
    padding: 16,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F2F3F5',
    letterSpacing: -0.01,
    marginBottom: 4,
  },
  tripDate: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9AA0AB',
  },
  tripTag: {
    backgroundColor: 'rgba(255,90,31,0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tripTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF5A1F',
  },
  tripDetails: {
    flexDirection: 'row',
    gap: 14,
    fontSize: 12,
    fontWeight: '600',
    color: '#9AA0AB',
  },
  tripDetail: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9AA0AB',
  },
  tripDetailHighlight: {
    color: '#FF5A1F',
  },
});
