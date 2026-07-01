import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Circle } from 'react-native-svg';
import { useNavigation } from '../navigation/Navigator';

export function HomeScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning, rider</Text>
          <Text style={styles.userName}>Alex Rider</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.notificationButton}>
            <Text style={styles.notificationIcon}>🔔</Text>
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
          <View style={styles.profileButton}>
            <Text style={styles.profileInitials}>AR</Text>
          </View>
        </View>
      </View>

      {/* Upcoming Ride Hero */}
      <Text style={styles.sectionLabel}>UPCOMING RIDE</Text>
      <TouchableOpacity style={styles.upcomingCard} activeOpacity={0.9}>
        {/* SVG Background */}
        <View style={styles.upcomingBackground}>
          <Svg height="100%" width="100%" style={styles.upcomingSvg}>
            <Path
              d="M-10 120 C60 90 90 40 160 55 S280 30 360 10"
              stroke="#FF5A1F"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M-10 120 C60 90 90 40 160 55 S280 30 360 10"
              stroke="#FF5A1F"
              strokeWidth="9"
              fill="none"
              opacity="0.16"
              strokeLinecap="round"
            />
            <Circle cx="160" cy="55" r="4" fill="#2E8BFF" />
            <Circle cx="358" cy="11" r="5" fill="#FF5A1F" />
          </Svg>
          <View style={styles.dateTagContainer}>
            <Text style={styles.dateTag}>THIS SATURDAY</Text>
          </View>
        </View>

        {/* Card Content */}
        <View style={styles.upcomingContent}>
          <Text style={styles.upcomingTitle}>Alpine Pass Loop</Text>
          <View style={styles.upcomingDetails}>
            <Text style={styles.upcomingTime}>Sat · 7:00 AM</Text>
            <Text style={styles.detailSeparator}>●</Text>
            <Text style={styles.upcomingDistance}>248 km</Text>
            <Text style={styles.upcomingDuration}>~5h</Text>
          </View>

          {/* Riders + Status */}
          <View style={styles.upcomingFooter}>
            <View style={styles.riderAvatars}>
              <View style={[styles.avatar, { backgroundColor: '#2E8BFF' }]}>
                <Text style={styles.avatarText}>M</Text>
              </View>
              <View style={[styles.avatar, { backgroundColor: '#FF9F0A', marginLeft: -9 }]}>
                <Text style={styles.avatarText}>A</Text>
              </View>
              <View style={[styles.avatar, { backgroundColor: '#30D158', marginLeft: -9 }]}>
                <Text style={styles.avatarText}>D</Text>
              </View>
              <View style={[styles.avatar, { backgroundColor: '#23272F', marginLeft: -9 }]}>
                <Text style={[styles.avatarText, { color: '#9AA0AB' }]}>+9</Text>
              </View>
            </View>
            <Text style={styles.goingText}>You're going →</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Quick Actions Grid */}
      <View style={styles.quickActionsGrid}>
        {/* Quick Ride */}
        <TouchableOpacity style={styles.quickRideButton}>
          <Text style={styles.quickIcon}>▶</Text>
          <Text style={styles.quickLabel}>Quick Ride</Text>
        </TouchableOpacity>

        {/* Explore Map */}
        <TouchableOpacity style={styles.exploreMapButton}>
          <Text style={styles.mapIcon}>🗺</Text>
          <Text style={styles.quickLabel}>Explore Map</Text>
        </TouchableOpacity>

        {/* Safety */}
        <TouchableOpacity style={styles.safetyButton}>
          <Text style={styles.warningIcon}>⚠</Text>
          <Text style={[styles.quickLabel, { color: '#FF453A' }]}>Safety</Text>
        </TouchableOpacity>
      </View>

      {/* Weather + Maintenance Row */}
      <View style={styles.weatherMaintenanceRow}>
        {/* Weather Card */}
        <View style={styles.weatherCard}>
          <View style={styles.weatherContent}>
            <Text style={styles.temperature}>18°</Text>
            <Text style={styles.weatherCondition}>Partly cloudy</Text>
          </View>
          <Text style={styles.weatherIcon}>☁️</Text>
        </View>

        {/* Maintenance Button */}
        <TouchableOpacity style={styles.maintenanceButton}>
          <View style={styles.maintenanceHeader}>
            <Text style={styles.maintenanceIconSmall}>⚙️</Text>
            <View style={styles.dueSoonBadge}>
              <Text style={styles.dueSoonText}>DUE SOON</Text>
            </View>
          </View>
          <Text style={styles.maintenanceTitle}>Oil Service</Text>
          <Text style={styles.maintenanceInfo}>Ducati · in 580 km</Text>
        </TouchableOpacity>
      </View>

      {/* Hazards Nearby */}
      <Text style={styles.sectionLabel}>HAZARDS NEARBY</Text>
      <View style={styles.hazardAlert}>
        <View style={styles.hazardIconContainer}>
          <Text style={styles.hazardIcon}>⚠</Text>
        </View>
        <View style={styles.hazardContent}>
          <Text style={styles.hazardTitle}>Gravel on road surface</Text>
          <Text style={styles.hazardInfo}>12 km ahead · reported 20m ago</Text>
        </View>
        <Text style={styles.hazardChevron}>›</Text>
      </View>

      {/* Recent Group Activity */}
      <Text style={styles.sectionLabel}>GROUP ACTIVITY</Text>
      <TouchableOpacity style={styles.groupActivityCard}>
        <View style={styles.groupAvatarLarge}>
          <Text style={styles.groupAvatarText}>IH</Text>
        </View>
        <View style={styles.groupActivityContent}>
          <View style={styles.groupActivityHeader}>
            <Text style={styles.groupName}>Iron Horizon MC</Text>
            <Text style={styles.activityTime}>2m</Text>
          </View>
          <Text style={styles.groupMessage}>Marcus: Route looks clear for Saturday 🏍️</Text>
        </View>
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>3</Text>
        </View>
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
    paddingTop: 62,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9AA0AB',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F2F3F5',
    letterSpacing: -0.48,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#15171C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    backgroundColor: '#FF453A',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#15171C',
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FF5A1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Upcoming Ride
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.08,
    color: '#6B7280',
    marginBottom: 10,
  },
  upcomingCard: {
    borderRadius: 24,
    backgroundColor: '#15171C',
    overflow: 'hidden',
    marginBottom: 26,
  },
  upcomingBackground: {
    height: 150,
    position: 'relative',
    backgroundColor: 'rgba(58, 42, 26, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  upcomingSvg: {
    position: 'absolute',
    opacity: 0.9,
  },
  dateTagContainer: {
    position: 'absolute',
    top: 14,
    left: 14,
  },
  dateTag: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,90,31,0.9)',
    borderRadius: 20,
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.06,
  },
  upcomingContent: {
    padding: 18,
  },
  upcomingTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#F2F3F5',
    letterSpacing: -0.01,
    marginBottom: 6,
  },
  upcomingDetails: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  upcomingTime: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9AA0AB',
  },
  detailSeparator: {
    fontSize: 13,
    color: '#FF5A1F',
  },
  upcomingDistance: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9AA0AB',
  },
  upcomingDuration: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9AA0AB',
  },
  upcomingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riderAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#15171C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  goingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF5A1F',
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 26,
  },
  quickRideButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: '#FF5A1F',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
  },
  exploreMapButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: '#15171C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
  },
  safetyButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,69,58,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
  },
  quickIcon: {
    fontSize: 24,
    color: '#fff',
  },
  mapIcon: {
    fontSize: 24,
    color: '#2E8BFF',
  },
  warningIcon: {
    fontSize: 24,
    color: '#FF453A',
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  // Weather + Maintenance
  weatherMaintenanceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 26,
  },
  weatherCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(19, 36, 51, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(46, 139, 255, 0.12)',
    justifyContent: 'space-between',
  },
  weatherContent: {
    marginBottom: 10,
  },
  temperature: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F2F3F5',
    letterSpacing: -0.02,
  },
  weatherCondition: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9AA0AB',
    marginTop: 4,
  },
  weatherIcon: {
    fontSize: 30,
    alignSelf: 'flex-end',
  },
  maintenanceButton: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#15171C',
    borderWidth: 1,
    borderColor: 'rgba(255,214,10,0.15)',
  },
  maintenanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  maintenanceIconSmall: {
    fontSize: 22,
  },
  dueSoonBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,214,10,0.12)',
    borderRadius: 8,
  },
  dueSoonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFD60A',
  },
  maintenanceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F2F3F5',
    marginBottom: 4,
  },
  maintenanceInfo: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9AA0AB',
  },

  // Hazards
  hazardAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,214,10,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,214,10,0.16)',
    marginBottom: 26,
  },
  hazardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,214,10,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hazardIcon: {
    fontSize: 20,
    color: '#FFD60A',
  },
  hazardContent: {
    flex: 1,
  },
  hazardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F2F3F5',
  },
  hazardInfo: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9AA0AB',
  },
  hazardChevron: {
    fontSize: 20,
    color: '#6B7280',
  },

  // Group Activity
  groupActivityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#15171C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  groupAvatarLarge: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: 'rgba(255,90,31,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  groupActivityContent: {
    flex: 1,
    minWidth: 0,
  },
  groupActivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F2F3F5',
  },
  activityTime: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  groupMessage: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9AA0AB',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    backgroundColor: '#FF5A1F',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
});
