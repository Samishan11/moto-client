import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  LiveRideMap,
  type HazardMarker,
  type RiderMarker,
} from "../components/LiveRideMap";
import { RequestLiftSheet } from "../components/RequestLiftSheet";
import { useNavigation } from "../navigation/Navigator";
import { useAuth } from "../auth/AuthContext";
import {
  distanceM,
  useNearbyRiders,
  usePresenceBroadcast,
  type LiveNearbyRider,
} from "../nearby/hooks";
import { useHazardSync, useNearbyHazards } from "../hazard/hooks";
import {
  useAcceptLift,
  useCloseLift,
  useLiftSync,
  useMyLift,
  useNearbyLifts,
  useUnacceptLift,
} from "../lift/hooks";
import { errorMessage } from "../api/errorMessage";
import { colors } from "../theme";

const RIDER_COLORS = ["#2E8BFF", "#30D158", "#BF5AF2", "#FF9F0A", "#FF375F"];

function initials(name: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  return (
    parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2)
  ).toUpperCase();
}

function fmtDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

/**
 * Global nearby-riders map (RIDE tab). You broadcast presence while it's open
 * and see mutual-group riders live. Degrades honestly: a banner while the
 * socket reconnects, permission prompt when GPS is off, empty state otherwise.
 */
export function NearbyRidersScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const { user } = useAuth();

  const { self, permission } = usePresenceBroadcast();
  const { riders, connected, isLoading } = useNearbyRiders(self, user?.id);

  // Lifts: my active request + nearby requests I could accept.
  useLiftSync(true);
  const myLift = useMyLift();
  const nearbyLifts = useNearbyLifts(self);
  const acceptLift = useAcceptLift();
  const closeLift = useCloseLift();
  const unacceptLift = useUnacceptLift();
  const [liftSheet, setLiftSheet] = useState(false);

  const mine = myLift.data ?? null;
  /** `mine` is either my own request or a lift I'm driving for someone else. */
  const iAmDriver = mine != null && mine.requester.id !== user?.id;
  const incoming = mine ? undefined : nearbyLifts.data?.[0]; // don't offer lifts while I have one
  const liftError =
    acceptLift.error ?? closeLift.error ?? unacceptLift.error ?? null;

  function onAccept(id: string): void {
    acceptLift.mutate(id, {
      onSuccess: (lift) =>
        Alert.alert(
          "Lift accepted",
          `You're giving ${lift.requester.displayName ?? "a rider"} a lift${lift.toLabel ? ` to ${lift.toLabel}` : ""}. Head to their pickup.`,
        ),
    });
  }

  function onCancelMine(): void {
    if (!mine) return;
    const accepted = mine.status === "ACCEPTED";
    Alert.alert(
      "Cancel lift request?",
      accepted
        ? `${mine.accepter?.displayName ?? "A rider"} is already on the way. They'll be notified.`
        : "Nearby riders will stop seeing your request.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel lift",
          style: "destructive",
          onPress: () =>
            closeLift.mutate({ id: mine.id, status: "CANCELLED" }),
        },
      ],
    );
  }

  function onDriverCancel(): void {
    if (!mine) return;
    Alert.alert(
      "Cancel this lift?",
      `${mine.requester.displayName ?? "The rider"} will go back to waiting and other nearby riders can accept instead.`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel lift",
          style: "destructive",
          onPress: () => unacceptLift.mutate(mine.id),
        },
      ],
    );
  }

  function onDriverComplete(): void {
    if (!mine) return;
    closeLift.mutate({ id: mine.id, status: "COMPLETED" });
  }

  // Hazards on the same map (shared cache + socket room with the live ride).
  useHazardSync(true);
  const hazardsQ = useNearbyHazards(self?.lat ?? null, self?.lng ?? null);
  const hazardMarkers: HazardMarker[] = useMemo(
    () =>
      (hazardsQ.data ?? []).map((h) => ({
        id: h.id,
        lat: h.latitude,
        lng: h.longitude,
        type: h.type,
      })),
    [hazardsQ.data],
  );

  // Stable color per rider id, assigned on first sight.
  const colorMap = useRef(new Map<string, string>());
  const colorFor = (id: string): string => {
    let c = colorMap.current.get(id);
    if (!c) {
      c = RIDER_COLORS[colorMap.current.size % RIDER_COLORS.length];
      colorMap.current.set(id, c);
    }
    return c;
  };

  const markers: RiderMarker[] = useMemo(() => {
    const out: RiderMarker[] = riders.map((r) => ({
      userId: r.userId,
      lat: r.lat,
      lng: r.lng,
      label: initials(r.displayName),
      color: colorFor(r.userId),
      isLeader: false,
      heading: r.heading,
    }));
    if (self && user?.id) {
      out.push({
        userId: user.id,
        lat: self.lat,
        lng: self.lng,
        label: initials(user.displayName ?? "Me"),
        color: colors.primary,
        isLeader: true, // bigger marker = "you"
        heading: self.heading,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riders, self, user?.id, user?.displayName]);

  // Nearest riders for the bottom panel.
  const nearest: (LiveNearbyRider & { distM: number })[] = useMemo(() => {
    if (!self) return [];
    return riders
      .map((r) => ({ ...r, distM: distanceM(self, r) }))
      .sort((a, b) => a.distM - b.distM)
      .slice(0, 3);
  }, [riders, self]);

  return (
    <View style={styles.flex}>
      <LiveRideMap riders={markers} hazards={hazardMarkers} />

      {/* Top HUD */}
      <View style={styles.topHud} pointerEvents="box-none">
        <View style={styles.livePill}>
          <View style={[styles.liveDot, !connected && styles.liveDotOffline]} />
          <Text style={styles.liveText}>
            NEARBY · {riders.length} {riders.length === 1 ? "rider" : "riders"}
          </Text>
        </View>
        <View style={styles.flex} />
        <Pressable
          style={styles.liftBtn}
          onPress={() => setLiftSheet(true)}
          hitSlop={8}
          disabled={mine != null}
          accessibilityRole="button"
          accessibilityLabel="Request a lift"
        >
          <Text style={styles.liftBtnIcon}>🚗</Text>
        </Pressable>
        <Pressable
          style={styles.hazardBtn}
          onPress={() => nav.navigate("reportHazard")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Report a hazard"
        >
          <Text style={styles.hazardBtnIcon}>⚠️</Text>
        </Pressable>
        <Pressable
          style={styles.closeBtn}
          onPress={nav.goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close nearby map"
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      {/* Degraded-state banners */}
      {!connected ? (
        <View style={[styles.banner, styles.bannerWarn]}>
          <Text style={styles.bannerWarnText}>
            Reconnecting — live updates paused. Riders refresh automatically.
          </Text>
        </View>
      ) : permission === "denied" ? (
        <View style={[styles.banner, styles.bannerError]}>
          <Text style={styles.bannerErrorText}>
            Location permission is off — enable it in Settings to see and be
            seen nearby.
          </Text>
        </View>
      ) : null}

      {/* Incoming lift request I could accept */}
      {incoming ? (
        <View style={styles.liftBanner} pointerEvents="box-none">
          <View style={styles.liftBannerRow}>
            <Text style={styles.liftBannerIcon}>🖐️</Text>
            <View style={styles.flex}>
              <Text style={styles.liftBannerTitle} numberOfLines={1}>
                {incoming.requester.displayName ?? "A rider"} needs a lift
              </Text>
              <Text style={styles.liftBannerSub} numberOfLines={1}>
                {incoming.toLabel ? `to ${incoming.toLabel}` : "nearby"}
                {incoming.distanceM != null
                  ? ` · ${fmtDistance(incoming.distanceM)} away`
                  : ""}
              </Text>
            </View>
            <Pressable
              style={styles.liftAcceptBtn}
              onPress={() => onAccept(incoming.id)}
              disabled={acceptLift.isPending}
            >
              <Text style={styles.liftAcceptText}>Accept</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Bottom panel */}
      <View style={styles.bottomPanel}>
        {liftError ? (
          <Text style={styles.liftErr}>{errorMessage(liftError, t)}</Text>
        ) : null}

        {/* My active lift — as driver (accepted someone) or as requester */}
        {mine && iAmDriver ? (
          <View style={styles.myLiftCard}>
            <View style={styles.flex}>
              <Text style={styles.myLiftTitle}>
                You're giving {mine.requester.displayName ?? "a rider"} a lift
              </Text>
              <Text style={styles.myLiftSub} numberOfLines={1}>
                {mine.toLabel ? `To ${mine.toLabel} · ` : ""}head to their
                pickup
              </Text>
            </View>
            <Pressable
              style={styles.myLiftComplete}
              onPress={onDriverComplete}
              disabled={closeLift.isPending || unacceptLift.isPending}
            >
              <Text style={styles.myLiftCompleteText}>Done</Text>
            </Pressable>
            <Pressable
              style={styles.myLiftCancel}
              onPress={onDriverCancel}
              disabled={closeLift.isPending || unacceptLift.isPending}
            >
              <Text style={styles.myLiftCancelText}>Cancel</Text>
            </Pressable>
          </View>
        ) : mine ? (
          <View style={styles.myLiftCard}>
            <View style={styles.flex}>
              <Text style={styles.myLiftTitle}>
                {mine.status === "ACCEPTED"
                  ? `${mine.accepter?.displayName ?? "A rider"} is coming for you`
                  : "Waiting for a driver…"}
              </Text>
              <Text style={styles.myLiftSub} numberOfLines={1}>
                Lift{mine.toLabel ? ` to ${mine.toLabel}` : ""} ·{" "}
                {mine.status === "ACCEPTED"
                  ? "on the way"
                  : "asking nearby riders"}
              </Text>
            </View>
            <Pressable
              style={styles.myLiftCancel}
              onPress={onCancelMine}
              disabled={closeLift.isPending}
            >
              <Text style={styles.myLiftCancelText}>Cancel</Text>
            </Pressable>
          </View>
        ) : null}

        {nearest.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {isLoading || !self
                ? "Finding riders near you…"
                : "No riders nearby yet"}
            </Text>
            <Text style={styles.emptySub}>
              You're visible to members of your groups while this map is open.
            </Text>
          </View>
        ) : (
          nearest.map((r) => (
            <View key={r.userId} style={styles.riderRow}>
              <View
                style={[
                  styles.riderChip,
                  { backgroundColor: colorFor(r.userId) },
                ]}
              >
                <Text style={styles.riderChipText}>
                  {initials(r.displayName)}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.riderName} numberOfLines={1}>
                  {r.displayName ?? "Rider"}
                </Text>
                <Text style={styles.riderMeta}>
                  {fmtDistance(r.distM)} away
                  {r.speed != null ? ` · ${Math.round(r.speed)} km/h` : ""}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <RequestLiftSheet
        visible={liftSheet}
        from={self ? { lat: self.lat, lng: self.lng } : null}
        onClose={() => setLiftSheet(false)}
      />
    </View>
  );
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
  liveDotOffline: { backgroundColor: "#FFD60A" },
  liveText: { fontSize: 13, fontWeight: "700", color: "#F2F3F5" },
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
  liftBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(46,139,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(46,139,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  liftBtnIcon: { fontSize: 16 },

  liftBanner: {
    position: "absolute",
    top: 108,
    left: 16,
    right: 16,
    zIndex: 6,
  },
  liftBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(46,139,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(46,139,255,0.4)",
  },
  liftBannerIcon: { fontSize: 20 },
  liftBannerTitle: { fontSize: 14, fontWeight: "700", color: "#F2F3F5" },
  liftBannerSub: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9AA0AB",
    marginTop: 1,
  },
  liftAcceptBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#2E8BFF",
  },
  liftAcceptText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  liftErr: {
    fontSize: 13,
    color: "#FF453A",
    marginBottom: 8,
    textAlign: "center",
  },
  myLiftCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: "rgba(255,90,31,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,90,31,0.35)",
  },
  myLiftTitle: { fontSize: 14, fontWeight: "700", color: "#F2F3F5" },
  myLiftSub: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9AA0AB",
    marginTop: 1,
  },
  myLiftComplete: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "rgba(48,209,88,0.14)",
    borderWidth: 1,
    borderColor: "rgba(48,209,88,0.3)",
  },
  myLiftCompleteText: { fontSize: 13, fontWeight: "700", color: "#30D158" },
  myLiftCancel: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "rgba(255,69,58,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,69,58,0.3)",
  },
  myLiftCancelText: { fontSize: 13, fontWeight: "700", color: "#FF453A" },
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

  banner: {
    position: "absolute",
    top: 108,
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 14,
    zIndex: 5,
    borderWidth: 1,
  },
  bannerWarn: {
    backgroundColor: "rgba(255,214,10,0.12)",
    borderColor: "rgba(255,214,10,0.3)",
  },
  bannerWarnText: { fontSize: 12, fontWeight: "600", color: "#FFD60A" },
  bannerError: {
    backgroundColor: "rgba(255,69,58,0.16)",
    borderColor: "rgba(255,69,58,0.3)",
  },
  bannerErrorText: { fontSize: 12, fontWeight: "600", color: "#FF453A" },

  bottomPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 110,
    gap: 8,
  },
  emptyCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(21,23,28,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: "#F2F3F5" },
  emptySub: { fontSize: 12, fontWeight: "500", color: "#9AA0AB", marginTop: 4 },
  riderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(21,23,28,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  riderChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  riderChipText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  riderName: { fontSize: 14, fontWeight: "600", color: "#F2F3F5" },
  riderMeta: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9AA0AB",
    marginTop: 1,
  },
});
