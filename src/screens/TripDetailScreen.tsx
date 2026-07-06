import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { Poll, TripDetail, TripStop } from "@samishan11/moto-contract";
import { Loading } from "../components/layout";
import { TripMap } from "../components/TripMap";
import { useNavigation } from "../navigation/Navigator";
import { useAuth } from "../auth/AuthContext";
import { useTrip } from "../api/queries";
import { queryClient } from "../api/queryClient";
import { queryKeys } from "../api/queries";
import { useDeleteTrip, useRsvp, useVotePoll } from "../trip/hooks";
import { useRouteWeather, type StopWeather } from "../trip/weather";
import { useStopPlaces } from "../trip/places";
import { distanceM } from "../nearby/hooks";
import {
  connectChatSocket,
  joinGroupRoom,
  subscribePolls,
} from "../chat/socket";
import { errorMessage } from "../api/errorMessage";
import { colors } from "../theme";

const STOP_COLORS = ["#30D158", "#2E8BFF", "#FF5A1F", "#BF5AF2", "#FF9F0A"];

/**
 * Route length in km: straight-line (great-circle) legs between consecutive
 * stops, start → end. An approximation — actual road distance will be longer.
 */
function routeKm(stops: TripStop[]): number | null {
  const ordered = [...stops].sort((a, b) => a.order - b.order);
  if (ordered.length < 2) return null;
  let meters = 0;
  for (let i = 1; i < ordered.length; i++) {
    meters += distanceM(
      { lat: ordered[i - 1].latitude, lng: ordered[i - 1].longitude },
      { lat: ordered[i].latitude, lng: ordered[i].longitude },
    );
  }
  return meters / 1000;
}

function kmLabel(km: number): string {
  return `${km >= 100 ? Math.round(km) : Math.round(km * 10) / 10} km`;
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) +
    " · " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

export function TripDetailScreen(): ReactNode {
  const nav = useNavigation();
  const id = typeof nav.params.id === "string" ? nav.params.id : "";
  const trip = useTrip(id);

  return (
    <View style={styles.flex}>
      {trip.data ? <Content trip={trip.data} /> : <Loading />}
    </View>
  );
}

function Content({ trip }: { trip: TripDetail }): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const { user } = useAuth();

  const rsvp = useRsvp(trip.id, trip.groupId);
  const del = useDeleteTrip(trip.groupId);
  const vote = useVotePoll(trip.id);
  const routeWeather = useRouteWeather(trip.stops, trip.scheduledAt);
  const stopPlaces = useStopPlaces(trip.stops);
  const distanceKm = useMemo(() => routeKm(trip.stops), [trip.stops]);

  // Label what the numbers represent so they're never misleading.
  const weatherHint =
    trip.stops.length === 0
      ? null
      : routeWeather.isError
        ? "Weather unavailable"
        : routeWeather.isFetching
          ? "Loading weather…"
          : routeWeather.basis === "typical"
            ? "Typical · recent-years average"
            : routeWeather.basis === "actual"
              ? "Recorded on ride day"
              : null;

  const isCreator = trip.createdBy === user?.id;
  const isUpcoming = new Date(trip.scheduledAt).getTime() > Date.now();

  // Live poll updates: patch the cached trip when anyone votes. Join the group
  // room first — the socket only auto-joins rooms at connect time, so without
  // this a poll voted on after we opened the trip wouldn't reach us live.
  useEffect(() => {
    const socket = connectChatSocket();
    joinGroupRoom(trip.groupId);
    const unsub = subscribePolls(socket, (e) => {
      if (e.tripId !== trip.id) return;
      queryClient.setQueryData<TripDetail>(queryKeys.trip(trip.id), (old) =>
        old
          ? {
              ...old,
              polls: old.polls.map((p) =>
                p.id === e.poll.id ? mergePoll(p, e.poll) : p,
              ),
            }
          : old,
      );
    });
    return unsub;
  }, [trip.id, trip.groupId]);

  const error = rsvp.error ?? del.error ?? vote.error ?? null;

  function handleDelete(): void {
    Alert.alert(
      "Cancel trip",
      `Delete "${trip.title}"? This can't be undone.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => del.mutate(trip.id, { onSuccess: () => nav.goBack() }),
        },
      ],
    );
  }

  function castVote(poll: Poll, optionId: string): void {
    if (poll.closed) return;
    vote.mutate({ pollId: poll.id, body: { optionIds: [optionId] } });
  }

  const going = trip.myRsvp === "GOING";

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      {/* Map header */}
      <View style={styles.mapHeader}>
        {trip.stops.length > 0 ? (
          <TripMap
            stops={trip.stops}
            weather={routeWeather.data}
            weatherNote={
              routeWeather.isError ? "Weather unavailable right now" : undefined
            }
            places={stopPlaces.data}
            height={230}
            interactive
          />
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>No stops mapped yet</Text>
          </View>
        )}
        <Pressable style={styles.backButton} onPress={nav.goBack} hitSlop={8}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{trip.title}</Text>
        <View style={styles.subRow}>
          <Text style={styles.sub}>📅 {timeLabel(trip.scheduledAt)}</Text>
          {trip.location ? (
            <Text style={styles.subAccent}>{trip.location}</Text>
          ) : null}
          {distanceKm != null ? (
            <Text style={styles.subAccent}>{kmLabel(distanceKm)}</Text>
          ) : null}
        </View>
        {trip.description ? (
          <Text style={styles.description}>{trip.description}</Text>
        ) : null}

        {/* Stat cards */}
        <View style={styles.statsRow}>
          <Stat value={String(trip.stopCount)} label="Stops" color="#2E8BFF" />
          <Stat value={String(trip.rsvp.going)} label="Going" color="#30D158" />
          <Stat value={String(trip.rsvp.maybe)} label="Maybe" color="#FFD60A" />
        </View>

        {error ? (
          <Text style={styles.error}>{errorMessage(error, t)}</Text>
        ) : null}

        {/* Route timeline */}
        {trip.stops.length > 0 ? (
          <>
            <View style={styles.timelineHeader}>
              <Text style={styles.sectionLabel}>ROUTE TIMELINE</Text>
              {weatherHint ? (
                <Text style={styles.weatherHint}>{weatherHint}</Text>
              ) : null}
            </View>
            <View style={styles.timeline}>
              <View style={styles.timelineLine} />
              {[...trip.stops]
                .sort((a, b) => a.order - b.order)
                .map((stop, i) => (
                  <StopRow
                    key={stop.id}
                    stop={stop}
                    color={STOP_COLORS[i % STOP_COLORS.length]}
                    weather={routeWeather.data?.[stop.id]}
                    place={stopPlaces.data?.[stop.id]}
                  />
                ))}
            </View>
          </>
        ) : null}

        {/* Polls */}
        <View style={styles.pollHeader}>
          <Text style={styles.sectionLabel}>POLLS</Text>
          {isCreator ? (
            <Pressable
              onPress={() => nav.navigate("pollForm", { tripId: trip.id })}
            >
              <Text style={styles.sectionAction}>＋ New poll</Text>
            </Pressable>
          ) : null}
        </View>
        {trip.polls.length === 0 ? (
          <Text style={styles.emptyText}>No polls yet.</Text>
        ) : (
          trip.polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} onVote={castVote} />
          ))
        )}

        {/* RSVP actions */}
        <View style={styles.rsvpRow}>
          {(["GOING", "MAYBE", "NOT_GOING"] as const).map((r) => {
            const active = trip.myRsvp === r;
            return (
              <Pressable
                key={r}
                style={[styles.rsvpBtn, active && styles.rsvpBtnActive]}
                onPress={() => rsvp.mutate({ rsvp: r })}
                disabled={rsvp.isPending}
              >
                <Text
                  style={[styles.rsvpText, active && styles.rsvpTextActive]}
                >
                  {r === "GOING"
                    ? "I'm going"
                    : r === "MAYBE"
                      ? "Maybe"
                      : "Can't go"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {going ? (
          <Text style={styles.goingHint}>
            ✓ You're going — see you on the road!
          </Text>
        ) : null}

        {isCreator && isUpcoming ? (
          <Pressable
            style={styles.editBtn}
            onPress={() => nav.navigate("editTrip", { id: trip.id })}
          >
            <Text style={styles.editBtnText}>✏️ Edit trip</Text>
          </Pressable>
        ) : null}

        {isCreator ? (
          <Pressable style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteText}>Cancel trip</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Stat({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}): ReactNode {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StopRow({
  stop,
  color,
  weather,
  place,
}: {
  stop: TripStop;
  color: string;
  weather?: StopWeather;
  /** Reverse-geocoded place name for the stop's coordinates. */
  place?: string;
}): ReactNode {
  const [expanded, setExpanded] = useState(false);
  const canExpand = weather != null;

  return (
    <View style={styles.stopGroup}>
      <Pressable
        style={styles.stopRow}
        onPress={() => canExpand && setExpanded((e) => !e)}
        disabled={!canExpand}
        accessibilityRole={canExpand ? "button" : undefined}
        accessibilityLabel={
          weather
            ? `${stop.name}, weather ${weather.label}, high ${weather.tempMaxC} degrees`
            : stop.name
        }
      >
        <View style={[styles.stopDot, { backgroundColor: color }]} />
        <View style={styles.flex}>
          <Text style={styles.stopName}>{stop.name}</Text>
          {place ? (
            <Text style={styles.stopPlace} numberOfLines={1}>
              📍 {place}
            </Text>
          ) : null}
          <Text style={styles.stopMeta}>
            {[stop.category, stop.eta != null ? `~${stop.eta} min` : null]
              .filter(Boolean)
              .join(" · ") || "Stop"}
          </Text>
        </View>
        {weather ? (
          <View style={styles.wxChip}>
            <Text style={styles.wxEmoji}>{weather.emoji}</Text>
            <Text style={styles.wxTemp}>{weather.tempMaxC}°</Text>
          </View>
        ) : null}
      </Pressable>

      {expanded && weather ? (
        <View style={styles.wxDetail}>
          <Text style={styles.wxDetailLabel}>
            {weather.label} · {basisText(weather.basis)}
          </Text>
          <View style={styles.wxStatsRow}>
            <WxStat label="HIGH" value={`${weather.tempMaxC}°`} />
            <WxStat label="LOW" value={`${weather.tempMinC}°`} />
            <WxStat
              label="RAIN"
              value={
                weather.precipProb != null
                  ? `${weather.precipProb}%`
                  : weather.precipMm != null
                    ? `${weather.precipMm} mm`
                    : "—"
              }
            />
            <WxStat
              label="WIND"
              value={weather.windKph != null ? `${weather.windKph} km/h` : "—"}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function basisText(basis: StopWeather["basis"]): string {
  return basis === "forecast"
    ? "forecast"
    : basis === "typical"
      ? "typical for the date"
      : "recorded";
}

function WxStat({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <View style={styles.wxStat}>
      <Text style={styles.wxStatValue}>{value}</Text>
      <Text style={styles.wxStatLabel}>{label}</Text>
    </View>
  );
}

/**
 * Merge a broadcast poll into the cached one: take the fresh counts/text/state,
 * but keep our own `votedByMe` per option. The broadcast carries the *voter's*
 * `votedByMe`, which would otherwise flip our own selection indicator.
 */
function mergePoll(mine: Poll, incoming: Poll): Poll {
  const mineByOption = new Map(mine.options.map((o) => [o.id, o.votedByMe]));
  return {
    ...incoming,
    options: incoming.options.map((o) => ({
      ...o,
      votedByMe: mineByOption.get(o.id) ?? o.votedByMe,
    })),
  };
}

function PollCard({
  poll,
  onVote,
}: {
  poll: Poll;
  onVote: (p: Poll, optionId: string) => void;
}): ReactNode {
  const total = poll.totalVotes || 0;
  return (
    <View style={styles.poll}>
      <View style={styles.pollTop}>
        <Text style={styles.pollQ}>🗳 {poll.question}</Text>
        {poll.closed ? <Text style={styles.pollClosed}>Closed</Text> : null}
      </View>
      {poll.options.map((o, i) => {
        const pct = total > 0 ? Math.round((o.voteCount / total) * 100) : 0;
        return (
          <Pressable
            key={o.id}
            onPress={() => onVote(poll, o.id)}
            disabled={poll.closed}
            style={styles.pollOption}
          >
            <View style={styles.pollOptTop}>
              <Text
                style={[
                  styles.pollOptText,
                  o.votedByMe && styles.pollOptTextMine,
                ]}
              >
                {o.votedByMe ? "● " : ""}
                {o.text}
              </Text>
              <Text style={styles.pollPct}>{pct}%</Text>
            </View>
            <View style={styles.pollTrack}>
              <View
                style={[
                  styles.pollFill,
                  {
                    width: `${pct}%`,
                    backgroundColor: i % 2 === 0 ? "#FF5A1F" : "#2E8BFF",
                  },
                ]}
              />
            </View>
          </Pressable>
        );
      })}
      <Text style={styles.pollTotal}>
        {total} {total === 1 ? "vote" : "votes"}
        {poll.isAnonymous ? " · anonymous" : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 120 },

  mapHeader: { height: 230, backgroundColor: "#171009" },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#171009",
  },
  mapPlaceholderText: { color: colors.muted, fontSize: 13 },
  backButton: {
    position: "absolute",
    top: 52,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(10,11,13,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: "#fff", fontSize: 22, fontWeight: "600", lineHeight: 24 },

  body: { paddingHorizontal: 20, paddingTop: 18 },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  subRow: { flexDirection: "row", gap: 14, marginTop: 8, flexWrap: "wrap" },
  sub: { fontSize: 13, fontWeight: "600", color: colors.muted },
  subAccent: { fontSize: 13, fontWeight: "600", color: colors.primary },
  description: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
    marginTop: 12,
  },

  statsRow: { flexDirection: "row", gap: 10, marginVertical: 18 },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.muted,
    marginTop: 2,
  },

  error: { fontSize: 13, color: "#FF453A", marginBottom: 10 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    letterSpacing: 1,
    marginBottom: 14,
    marginTop: 6,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weatherHint: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 14,
    marginTop: 6,
  },
  timeline: { position: "relative", paddingLeft: 26, marginBottom: 22 },
  timelineLine: {
    position: "absolute",
    left: 8,
    top: 6,
    bottom: 6,
    width: 2,
    backgroundColor: "#2E8BFF",
    opacity: 0.5,
  },
  stopGroup: { marginBottom: 20 },
  stopRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  wxChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "rgba(46,139,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(46,139,255,0.2)",
  },
  wxEmoji: { fontSize: 14 },
  wxTemp: { fontSize: 13, fontWeight: "700", color: colors.text },
  wxDetail: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(21,23,28,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  wxDetailLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 10,
  },
  wxStatsRow: { flexDirection: "row", justifyContent: "space-between" },
  wxStat: { alignItems: "center", flex: 1 },
  wxStatValue: { fontSize: 15, fontWeight: "800", color: colors.text },
  wxStatLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#6B7280",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  stopDot: {
    position: "absolute",
    left: -24,
    top: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: colors.bg,
  },
  stopName: { fontSize: 14, fontWeight: "700", color: colors.text },
  stopPlace: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    marginTop: 2,
  },
  stopMeta: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.faint,
    marginTop: 2,
  },

  pollHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 14,
  },
  emptyText: { fontSize: 13, color: colors.muted, marginBottom: 16 },

  poll: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 16,
  },
  pollTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  pollQ: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.text },
  pollClosed: { fontSize: 11, fontWeight: "700", color: colors.muted },
  pollOption: { marginBottom: 10 },
  pollOptTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  pollOptText: { fontSize: 12, fontWeight: "600", color: colors.text },
  pollOptTextMine: { color: colors.primary },
  pollPct: { fontSize: 12, fontWeight: "600", color: colors.muted },
  pollTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#23272F",
    overflow: "hidden",
  },
  pollFill: { height: "100%", borderRadius: 4 },
  pollTotal: { fontSize: 11, color: colors.muted, marginTop: 4 },

  rsvpRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  rsvpBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  rsvpBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rsvpText: { fontSize: 13, fontWeight: "700", color: colors.text },
  rsvpTextActive: { color: "#fff" },
  goingHint: {
    fontSize: 13,
    fontWeight: "600",
    color: "#30D158",
    textAlign: "center",
    marginTop: 14,
  },

  deleteBtn: {
    marginTop: 20,
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(255,69,58,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,69,58,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: { fontSize: 15, fontWeight: "600", color: "#FF453A" },
  editBtn: {
    marginTop: 24,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  editBtnText: { fontSize: 15, fontWeight: "700", color: colors.text },
});
