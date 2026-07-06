import { useCallback, useMemo, type ReactNode } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import type { Group, Reminder, Trip } from "@samishan11/moto-contract";
import { useNavigation } from "../navigation/Navigator";
import {
  useMyTrips,
  useProfile,
  useReminders,
  useGroups,
} from "../api/queries";
import { useNearbyHazards } from "../hazard/hooks";
import { hazardMeta } from "../hazard/meta";
import { useCurrentLocation, useWeather } from "../home/hooks";

// --- Formatting helpers ---

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function initials(name: string | null | undefined): string {
  if (!name?.trim()) return "R";
  const parts = name.trim().split(/\s+/);
  return (
    parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2)
  ).toUpperCase();
}

/** Relative day tag for the hero: TODAY / TOMORROW / weekday / date. */
function dayTag(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(d) - startOf(now)) / 86_400_000);
  if (days <= 0) return "TODAY";
  if (days === 1) return "TOMORROW";
  if (days < 7)
    return d.toLocaleDateString([], { weekday: "long" }).toUpperCase();
  return d
    .toLocaleDateString([], { month: "short", day: "numeric" })
    .toUpperCase();
}

function tripTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString([], { weekday: "short" }) +
    " · " +
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  );
}

function timeAgo(iso: string): string {
  const s = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function reminderLabel(kind: Reminder["kind"]): string {
  return kind === "INSURANCE_EXPIRY"
    ? "Insurance renewal"
    : "Registration renewal";
}

function reminderDue(days: number): string {
  if (days < 0) return `overdue by ${Math.abs(days)}d`;
  if (days === 0) return "due today";
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

export function HomeScreen(): ReactNode {
  const nav = useNavigation();

  const profile = useProfile();
  const myTrips = useMyTrips(true);
  const reminders = useReminders();
  const groups = useGroups();
  const coords = useCurrentLocation();
  const hazards = useNearbyHazards(coords?.lat ?? null, coords?.lng ?? null);
  const weather = useWeather(coords);

  // The single most urgent maintenance reminder (soonest / most overdue).
  const nextReminder = useMemo<Reminder | undefined>(() => {
    const list = reminders.data ?? [];
    return list.length
      ? [...list].sort((a, b) => a.daysUntilDue - b.daysUntilDue)[0]
      : undefined;
  }, [reminders.data]);

  const nextTrip = myTrips.data?.[0];
  const nearestHazard = hazards.data?.[0];
  const topGroup = groups.data?.[0];

  const refreshing =
    profile.isRefetching ||
    myTrips.isRefetching ||
    reminders.isRefetching ||
    groups.isRefetching;

  const onRefresh = useCallback(() => {
    profile.refetch();
    myTrips.refetch();
    reminders.refetch();
    groups.refetch();
    hazards.refetch();
    weather.refetch();
  }, [profile, myTrips, reminders, groups, hazards, weather]);

  const name = profile.data?.displayName ?? "Rider";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FF5A1F"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.flexShrink}>
          <Text style={styles.greeting}>{greeting()}, rider</Text>
          <Text style={styles.userName} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => nav.navigate("profile")}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            {profile.data?.avatarUrl ? (
              <Image
                source={{ uri: profile.data.avatarUrl }}
                style={styles.profileAvatar}
              />
            ) : (
              <Text style={styles.profileInitials}>
                {initials(profile.data?.displayName)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Upcoming Ride Hero */}
      <Text style={styles.sectionLabel}>UPCOMING RIDE</Text>
      {nextTrip ? (
        <UpcomingRideCard
          trip={nextTrip}
          onPress={() => nav.navigate("tripDetail", { id: nextTrip.id })}
        />
      ) : (
        <TouchableOpacity
          style={styles.emptyHero}
          activeOpacity={0.85}
          onPress={() => nav.navigate("groups")}
        >
          <Text style={styles.emptyHeroTitle}>
            {myTrips.isLoading ? "Loading your rides…" : "No upcoming rides"}
          </Text>
          {!myTrips.isLoading ? (
            <Text style={styles.emptyHeroSub}>Plan one with your group →</Text>
          ) : null}
        </TouchableOpacity>
      )}

      {/* Quick Actions Grid */}
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.quickRideButton}
          onPress={() => nav.navigate("nearbyRide")}
        >
          <Text style={styles.quickIcon}>▶</Text>
          <Text style={styles.quickLabel}>Quick Ride</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.exploreMapButton}
          onPress={() => nav.navigate("nearbyRide")}
        >
          <Text style={styles.mapIcon}>🗺</Text>
          <Text style={styles.quickLabel}>Explore Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.safetyButton}
          onPress={() => nav.navigate("reportHazard")}
        >
          <Text style={styles.warningIcon}>⚠</Text>
          <Text style={[styles.quickLabel, { color: "#FF453A" }]}>Safety</Text>
        </TouchableOpacity>
      </View>

      {/* Weather + Maintenance Row */}
      <View style={styles.weatherMaintenanceRow}>
        {/* Weather Card */}
        <View style={styles.weatherCard}>
          <View style={styles.weatherContent}>
            <Text style={styles.temperature}>
              {weather.data ? `${weather.data.tempC}°` : "—"}
            </Text>
            <Text style={styles.weatherCondition}>
              {weather.data
                ? weather.data.label
                : coords
                  ? "Weather unavailable"
                  : "Enable location"}
            </Text>
          </View>
          <Text style={styles.weatherIcon}>{weather.data?.emoji ?? "☁️"}</Text>
        </View>

        {/* Maintenance */}
        {nextReminder ? (
          <TouchableOpacity
            style={styles.maintenanceButton}
            onPress={() =>
              nav.navigate("bikeDetail", { id: nextReminder.bikeId })
            }
          >
            <View style={styles.maintenanceHeader}>
              <Text style={styles.maintenanceIconSmall}>⚙️</Text>
              <MaintenanceBadge days={nextReminder.daysUntilDue} />
            </View>
            <Text style={styles.maintenanceTitle} numberOfLines={1}>
              {reminderLabel(nextReminder.kind)}
            </Text>
            <Text style={styles.maintenanceInfo} numberOfLines={1}>
              {nextReminder.bikeLabel} ·{" "}
              {reminderDue(nextReminder.daysUntilDue)}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.maintenanceButton}>
            <View style={styles.maintenanceHeader}>
              <Text style={styles.maintenanceIconSmall}>✅</Text>
            </View>
            <Text style={styles.maintenanceTitle}>All up to date</Text>
            <Text style={styles.maintenanceInfo}>No renewals due</Text>
          </View>
        )}
      </View>

      {/* Hazards Nearby — only when we have a nearby report */}
      {nearestHazard ? (
        <>
          <Text style={styles.sectionLabel}>HAZARDS NEARBY</Text>
          <TouchableOpacity
            style={styles.hazardAlert}
            onPress={() => nav.navigate("nearbyRide")}
          >
            <View style={styles.hazardIconContainer}>
              <Text style={styles.hazardIcon}>
                {hazardMeta(nearestHazard.type).emoji}
              </Text>
            </View>
            <View style={styles.hazardContent}>
              <Text style={styles.hazardTitle} numberOfLines={1}>
                {nearestHazard.description?.trim() ||
                  hazardMeta(nearestHazard.type).label}
              </Text>
              <Text style={styles.hazardInfo}>
                {nearestHazard.distanceM != null
                  ? `${formatDistance(nearestHazard.distanceM)} away · `
                  : ""}
                reported {timeAgo(nearestHazard.createdAt)}
              </Text>
            </View>
            <Text style={styles.hazardChevron}>›</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {/* Group Activity */}
      <Text style={styles.sectionLabel}>YOUR GROUPS</Text>
      {topGroup ? (
        <GroupRow
          group={topGroup}
          onPress={() => nav.navigate("groupDetail", { id: topGroup.id })}
        />
      ) : (
        <TouchableOpacity
          style={styles.groupEmpty}
          onPress={() => nav.navigate("groups")}
          activeOpacity={0.85}
        >
          <Text style={styles.groupEmptyText}>
            {groups.isLoading
              ? "Loading groups…"
              : "Find a group to ride with →"}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function MaintenanceBadge({ days }: { days: number }): ReactNode {
  if (days < 0) {
    return (
      <View style={[styles.dueSoonBadge, styles.overdueBadge]}>
        <Text style={[styles.dueSoonText, styles.overdueText]}>OVERDUE</Text>
      </View>
    );
  }
  if (days <= 30) {
    return (
      <View style={styles.dueSoonBadge}>
        <Text style={styles.dueSoonText}>DUE SOON</Text>
      </View>
    );
  }
  return null;
}

function UpcomingRideCard({
  trip,
  onPress,
}: {
  trip: Trip;
  onPress: () => void;
}): ReactNode {
  const going = trip.rsvp.going;
  return (
    <TouchableOpacity
      style={styles.upcomingCard}
      activeOpacity={0.9}
      onPress={onPress}
    >
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
          <Text style={styles.dateTag}>{dayTag(trip.scheduledAt)}</Text>
        </View>
      </View>

      <View style={styles.upcomingContent}>
        <Text style={styles.upcomingTitle} numberOfLines={1}>
          {trip.title}
        </Text>
        <View style={styles.upcomingDetails}>
          <Text style={styles.upcomingTime}>{tripTime(trip.scheduledAt)}</Text>
          {trip.location ? (
            <>
              <Text style={styles.detailSeparator}>●</Text>
              <Text style={styles.upcomingDistance} numberOfLines={1}>
                {trip.location}
              </Text>
            </>
          ) : null}
          {trip.stopCount > 0 ? (
            <Text style={styles.upcomingDuration}>
              {trip.stopCount} stop{trip.stopCount === 1 ? "" : "s"}
            </Text>
          ) : null}
        </View>

        <View style={styles.upcomingFooter}>
          <Text style={styles.goingCount}>
            {going > 0 ? `${going} going` : "Be the first to RSVP"}
          </Text>
          <Text style={styles.goingText}>
            {trip.myRsvp === "GOING" ? "You're going →" : "View ride →"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function GroupRow({
  group,
  onPress,
}: {
  group: Group;
  onPress: () => void;
}): ReactNode {
  return (
    <TouchableOpacity style={styles.groupActivityCard} onPress={onPress}>
      <View style={styles.groupAvatarLarge}>
        <Text style={styles.groupAvatarText}>{initials(group.name)}</Text>
      </View>
      <View style={styles.groupActivityContent}>
        <Text style={styles.groupName} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={styles.groupMessage} numberOfLines={1}>
          {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
          {group.location ? ` · ${group.location}` : ""}
        </Text>
      </View>
      <Text style={styles.hazardChevron}>›</Text>
    </TouchableOpacity>
  );
}

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B0D",
  },
  scrollContent: {
    paddingTop: 62,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  greeting: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9AA0AB",
  },
  userName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#F2F3F5",
    letterSpacing: -0.48,
    marginTop: 2,
  },
  flexShrink: { flexShrink: 1, paddingRight: 12 },
  headerButtons: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FF5A1F",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  profileAvatar: { width: 42, height: 42, borderRadius: 21 },
  profileInitials: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  // Upcoming Ride
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.08,
    color: "#6B7280",
    marginBottom: 10,
  },
  upcomingCard: {
    borderRadius: 24,
    backgroundColor: "#15171C",
    overflow: "hidden",
    marginBottom: 26,
  },
  upcomingBackground: {
    height: 150,
    position: "relative",
    backgroundColor: "rgba(58, 42, 26, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  upcomingSvg: {
    position: "absolute",
    opacity: 0.9,
  },
  dateTagContainer: {
    position: "absolute",
    top: 14,
    left: 14,
  },
  dateTag: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    backgroundColor: "rgba(255,90,31,0.9)",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.06,
  },
  upcomingContent: {
    padding: 18,
  },
  upcomingTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#F2F3F5",
    letterSpacing: -0.01,
    marginBottom: 6,
  },
  upcomingDetails: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 14,
  },
  upcomingTime: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9AA0AB",
  },
  detailSeparator: {
    fontSize: 13,
    color: "#FF5A1F",
  },
  upcomingDistance: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9AA0AB",
  },
  upcomingDuration: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9AA0AB",
  },
  upcomingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  riderAvatars: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#15171C",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  goingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF5A1F",
  },
  goingCount: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9AA0AB",
  },
  emptyHero: {
    borderRadius: 24,
    backgroundColor: "#15171C",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 22,
    marginBottom: 26,
    alignItems: "flex-start",
    gap: 6,
  },
  emptyHeroTitle: { fontSize: 16, fontWeight: "700", color: "#F2F3F5" },
  emptyHeroSub: { fontSize: 13, fontWeight: "500", color: "#FF5A1F" },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 26,
  },
  quickRideButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: "#FF5A1F",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
  },
  exploreMapButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: "#15171C",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
  },
  safetyButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,69,58,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,69,58,0.25)",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
  },
  quickIcon: {
    fontSize: 24,
    color: "#fff",
  },
  mapIcon: {
    fontSize: 24,
    color: "#2E8BFF",
  },
  warningIcon: {
    fontSize: 24,
    color: "#FF453A",
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },

  // Weather + Maintenance
  weatherMaintenanceRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 26,
  },
  weatherCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(19, 36, 51, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(46, 139, 255, 0.12)",
    justifyContent: "space-between",
  },
  weatherContent: {
    marginBottom: 10,
  },
  temperature: {
    fontSize: 28,
    fontWeight: "800",
    color: "#F2F3F5",
    letterSpacing: -0.02,
  },
  weatherCondition: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9AA0AB",
    marginTop: 4,
  },
  weatherIcon: {
    fontSize: 30,
    alignSelf: "flex-end",
  },
  maintenanceButton: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#15171C",
    borderWidth: 1,
    borderColor: "rgba(255,214,10,0.15)",
  },
  maintenanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  maintenanceIconSmall: {
    fontSize: 22,
  },
  dueSoonBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: "rgba(255,214,10,0.12)",
    borderRadius: 8,
  },
  dueSoonText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFD60A",
  },
  overdueBadge: { backgroundColor: "rgba(255,69,58,0.14)" },
  overdueText: { color: "#FF453A" },
  maintenanceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F2F3F5",
    marginBottom: 4,
  },
  maintenanceInfo: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9AA0AB",
  },

  // Hazards
  hazardAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,214,10,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,214,10,0.16)",
    marginBottom: 26,
  },
  hazardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,214,10,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },
  hazardIcon: {
    fontSize: 20,
    color: "#FFD60A",
  },
  hazardContent: {
    flex: 1,
  },
  hazardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F2F3F5",
  },
  hazardInfo: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9AA0AB",
  },
  hazardChevron: {
    fontSize: 20,
    color: "#6B7280",
  },

  // Group Activity
  groupActivityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 14,
    borderRadius: 20,
    backgroundColor: "#15171C",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  groupAvatarLarge: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "rgba(255,90,31,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  groupAvatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  groupActivityContent: {
    flex: 1,
    minWidth: 0,
  },
  groupActivityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  groupName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F2F3F5",
  },
  activityTime: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
  },
  groupMessage: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9AA0AB",
  },
  groupEmpty: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#15171C",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  groupEmptyText: { fontSize: 14, fontWeight: "600", color: "#FF5A1F" },
});
