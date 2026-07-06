import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Hazard } from "@samishan11/moto-contract";
import { hazardMeta } from "../hazard/meta";

/**
 * Nearby-hazard card — pixel-matched to the design's "HAZARDS NEARBY" row
 * (warning-yellow surface, 40px icon tile, title/subtitle, chevron).
 */
export function HazardBanner({
  hazard,
  onPress,
}: {
  hazard: Hazard;
  onPress?: () => void;
}): ReactNode {
  const meta = hazardMeta(hazard.type);
  const distance =
    hazard.distanceM != null ? formatDistance(hazard.distanceM) : null;
  const sub = [
    distance && `${distance} away`,
    `reported ${timeAgo(hazard.createdAt)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Hazard: ${hazard.description ?? meta.label}, ${sub}`}
      style={styles.card}
    >
      <View style={styles.iconTile}>
        <Text style={styles.icon}>{meta.emoji}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {hazard.description?.trim() || meta.label}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function timeAgo(iso: string): string {
  const secs = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,214,10,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,214,10,0.16)",
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,214,10,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 18 },
  body: { flex: 1 },
  title: { fontSize: 14, fontWeight: "600", color: "#F2F3F5" },
  sub: { fontSize: 12, fontWeight: "500", color: "#9AA0AB", marginTop: 2 },
  chevron: { color: "#6B7280", fontSize: 20 },
});
