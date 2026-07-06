import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { RideDetail, RideParticipant } from "@samishan11/moto-contract";
import { Loading } from "../components/layout";
import {
  LiveRideMap,
  liveMapAvailable,
  type LiveRideMapHandle,
  type RiderMarker,
  type HazardMarker,
} from "../components/LiveRideMap";
import { HazardBanner } from "../components/HazardBanner";
import { useNavigation } from "../navigation/Navigator";
import { useAuth } from "../auth/AuthContext";
import { useRide } from "../api/queries";
import { useJoinRide, useLeaveRide, useUpdateRideStatus } from "../ride/hooks";
import { useRideLocation } from "../ride/useRideLocation";
import { useLiveRide } from "../ride/useLiveRide";
import { useNearbyHazards, useHazardSync } from "../hazard/hooks";
import { errorMessage } from "../api/errorMessage";
import { colors } from "../theme";

/** Rider marker colors: leader always orange; others cycle. */
const RIDER_COLORS = ["#2E8BFF", "#FF9F0A", "#30D158", "#BF5AF2", "#FF375F"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (
    parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2)
  ).toUpperCase();
}

export function LiveRideScreen(): ReactNode {
  const nav = useNavigation();
  const id = typeof nav.params.id === "string" ? nav.params.id : "";
  const ride = useRide(id);

  return (
    <View style={styles.flex}>
      {ride.data ? <Content ride={ride.data} /> : <Loading />}
    </View>
  );
}

function Content({ ride }: { ride: RideDetail }): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const { user } = useAuth();
  const mapRef = useRef<LiveRideMapHandle>(null);

  const isLeader = ride.leaderId === user?.id;
  const iAmRiding = ride.myStatus === "RIDING";

  const statusMut = useUpdateRideStatus(ride.id, ride.groupId);
  const join = useJoinRide(ride.id, ride.groupId);
  const leave = useLeaveRide(ride.id, ride.groupId);

  // Always watch GPS so I see myself on the map; only broadcast to the group
  // while I'm actively riding and the ride is live.
  const broadcasting = iAmRiding && ride.status === "ACTIVE";
  const { self, permission, background } = useRideLocation({
    watch: true,
    broadcast: broadcasting,
    rideId: ride.id,
  });

  // Real-time positions + live status. The hook reconciles socket events
  // (location, join, leave, status) and keeps the roster fresh so a mid-ride
  // joiner shows up with their real name/color and in the rider count.
  const { positions, status: rideStatus, staleIds } = useLiveRide({
    ride,
    selfUserId: user?.id,
    self,
    onCompleted: () =>
      nav.replace("rideStats", { id: ride.id, groupId: ride.groupId }),
  });

  const [elapsed, setElapsed] = useState(0);

  // Stable color per participant.
  const colorFor = useMemo(() => {
    const map: Record<string, string> = {};
    let i = 0;
    for (const p of ride.participants) {
      map[p.user.id] =
        p.user.id === ride.leaderId
          ? "#FF5A1F"
          : RIDER_COLORS[i++ % RIDER_COLORS.length];
    }
    return map;
  }, [ride.participants, ride.leaderId]);

  const nameFor = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of ride.participants)
      map[p.user.id] = p.user.displayName ?? "Rider";
    return map;
  }, [ride.participants]);

  // Elapsed timer.
  useEffect(() => {
    if (!ride.startedAt) return;
    const started = new Date(ride.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - started) / 1000));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [ride.startedAt]);

  // Push markers to the map whenever positions change.
  const markers: RiderMarker[] = useMemo(
    () =>
      Object.entries(positions).map(([userId, p]) => ({
        userId,
        lat: p.lat,
        lng: p.lng,
        label: initials(nameFor[userId] ?? "R"),
        color: colorFor[userId] ?? "#2E8BFF",
        isLeader: userId === ride.leaderId,
        heading: p.heading,
        stale: staleIds.has(userId),
      })),
    [positions, colorFor, nameFor, ride.leaderId, staleIds],
  );

  // --- Hazards: nearby list (anchored to my position) + live sync + map pins ---
  useHazardSync(true);
  const hazardsQ = useNearbyHazards(self?.lat ?? null, self?.lng ?? null);
  const hazards = hazardsQ.data ?? [];
  const hazardMarkers: HazardMarker[] = useMemo(
    () =>
      hazards.map((h) => ({
        id: h.id,
        lat: h.latitude,
        lng: h.longitude,
        type: h.type,
      })),
    [hazards],
  );
  // Backend returns nearest-first; surface the closest as the alert banner.
  const nearestHazard = hazards[0];

  const error = statusMut.error ?? join.error ?? leave.error ?? null;

  // My own live stats for the HUD.
  const mine = user?.id ? positions[user.id] : undefined;
  const speedKph = mine?.speed != null ? Math.round(mine.speed) : 0;
  const battery = mine?.battery ?? null;
  const activeRiders = ride.participants.filter(
    (p) => p.status === "RIDING" || p.status === "WAITING",
  ).length;

  function confirmEnd(): void {
    Alert.alert("End ride", "End the ride for everyone? Stats will be saved.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End ride",
        style: "destructive",
        onPress: () =>
          statusMut.mutate(
            { status: "COMPLETED" },
            {
              onSuccess: () =>
                nav.replace("rideStats", {
                  id: ride.id,
                  groupId: ride.groupId,
                }),
            },
          ),
      },
    ]);
  }

  const paused = rideStatus === "PAUSED";

  return (
    <View style={styles.flex}>
      <LiveRideMap ref={mapRef} riders={markers} hazards={hazardMarkers} />

      {/* Recenter — frames the whole group again after panning away.
          Slot + styling mirror the design's floating compass control. */}
      {liveMapAvailable ? (
        <Pressable
          style={styles.recenterBtn}
          onPress={() => mapRef.current?.recenter()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Recenter map on the group"
        >
          <Text style={styles.recenterIcon}>◎</Text>
        </Pressable>
      ) : null}

      {/* Top HUD */}
      <View style={styles.topHud} pointerEvents="box-none">
        <View style={styles.livePill}>
          <View style={[styles.liveDot, paused && styles.liveDotPaused]} />
          <Text style={styles.liveText}>
            {paused ? "PAUSED" : "LIVE"} · {activeRiders}{" "}
            {activeRiders === 1 ? "rider" : "riders"}
          </Text>
        </View>
        <View style={styles.flex} />
        {battery != null ? (
          <View style={styles.batteryPill}>
            <Text style={styles.batteryText}>🔋 {battery}%</Text>
          </View>
        ) : null}
        <Pressable
          style={styles.hazardBtn}
          onPress={() => nav.navigate("reportHazard")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Report a hazard"
        >
          <Text style={styles.hazardBtnIcon}>⚠️</Text>
        </Pressable>
        <Pressable style={styles.closeBtn} onPress={nav.goBack} hitSlop={8}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      {/* Nearby hazard alert */}
      {nearestHazard ? (
        <View style={styles.hazardAlert} pointerEvents="box-none">
          <HazardBanner hazard={nearestHazard} />
        </View>
      ) : null}

      {/* Permission prompts. Hazard alerts share this slot and win — they're
          time-critical; the background hint returns once the hazard clears. */}
      {permission === "denied" ? (
        <View style={styles.permBanner}>
          <Text style={styles.permText}>
            {broadcasting
              ? "Location permission is off — you can't see yourself and others can't see you. Enable it in Settings."
              : "Location permission is off — your position won't show on the map. Enable it in Settings."}
          </Text>
        </View>
      ) : broadcasting && background === "denied" && !nearestHazard ? (
        <View style={[styles.permBanner, styles.bgBanner]}>
          <Text style={styles.bgText}>
            Background location is off — you'll disappear from the group map
            when your screen locks. Allow location access "Always" / "All the
            time" in Settings.
          </Text>
        </View>
      ) : null}

      {/* Bottom control panel */}
      <View style={styles.bottomPanel}>
        {error ? (
          <Text style={styles.error}>{errorMessage(error, t)}</Text>
        ) : null}

        <View style={styles.statsRow}>
          <Stat value={String(speedKph)} label="KM/H" />
          <Stat value={fmtClock(elapsed)} label="ELAPSED" accent="#2E8BFF" />
          <Stat value={String(activeRiders)} label="RIDERS" accent="#FF5A1F" />
        </View>

        {/* Controls */}
        {!iAmRiding ? (
          <Pressable
            style={styles.joinBtn}
            onPress={() => join.mutate()}
            disabled={join.isPending || rideStatus === "COMPLETED"}
          >
            <Text style={styles.joinText}>Join ride</Text>
          </Pressable>
        ) : isLeader ? (
          <View style={styles.controlsRow}>
            <Pressable
              style={styles.pauseBtn}
              onPress={() =>
                statusMut.mutate({ status: paused ? "ACTIVE" : "PAUSED" })
              }
            >
              <Text style={styles.pauseText}>
                {paused ? "▶ Resume" : "⏸ Pause"}
              </Text>
            </Pressable>
            <Pressable style={styles.endBtn} onPress={confirmEnd}>
              <Text style={styles.endText}>End Ride</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.leaveBtn}
            onPress={() =>
              leave.mutate(undefined, { onSuccess: () => nav.goBack() })
            }
          >
            <Text style={styles.leaveText}>Leave ride</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Stat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: string;
}): ReactNode {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, accent ? { color: accent } : null]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function fmtClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#0a0f14" },

  topHud: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 5,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(10,15,20,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#30D158" },
  liveDotPaused: { backgroundColor: "#FFD60A" },
  liveText: { fontSize: 13, fontWeight: "700", color: "#F2F3F5" },
  batteryPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(10,15,20,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  batteryText: { fontSize: 12, fontWeight: "700", color: "#30D158" },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(10,15,20,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  hazardBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,214,10,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,214,10,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  hazardBtnIcon: { fontSize: 16 },
  hazardAlert: {
    position: "absolute",
    top: 108,
    left: 16,
    right: 16,
    zIndex: 5,
  },

  // Design's floating map control: 54px circle, right 20 / top 180.
  recenterBtn: {
    position: "absolute",
    right: 20,
    top: 180,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(10,15,20,0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  recenterIcon: { color: "#F2F3F5", fontSize: 22, fontWeight: "700" },

  permBanner: {
    position: "absolute",
    top: 108,
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,69,58,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,69,58,0.3)",
    zIndex: 5,
  },
  permText: { fontSize: 12, fontWeight: "600", color: "#FF453A" },
  bgBanner: {
    backgroundColor: "rgba(255,214,10,0.12)",
    borderColor: "rgba(255,214,10,0.3)",
  },
  bgText: { fontSize: 12, fontWeight: "600", color: "#FFD60A" },

  bottomPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingBottom: 34,
    paddingTop: 16,
  },
  error: {
    fontSize: 13,
    color: "#FF453A",
    marginBottom: 10,
    textAlign: "center",
  },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(21,23,28,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
  },
  statValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#F2F3F5",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9AA0AB",
    letterSpacing: 0.5,
    marginTop: 2,
  },

  controlsRow: { flexDirection: "row", gap: 12 },
  pauseBtn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(21,23,28,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  pauseText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  endBtn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#FF453A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF453A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  endText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  joinBtn: {
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF5A1F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  joinText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  leaveBtn: {
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,69,58,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,69,58,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  leaveText: { fontSize: 15, fontWeight: "700", color: "#FF453A" },
});
