import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { TripStop } from "@moto/contract";
import { Field } from "./ui";
import { TripMap } from "./TripMap";
import { MapRoutePicker, type PickedPoint } from "./MapRoutePicker";
import { colors, spacing } from "../theme";

/** A stop being edited on the map; name/category are filled in the form. */
export interface DraftStop {
  name: string;
  category: string;
  latitude: number;
  longitude: number;
}

function coordLabel(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/**
 * Pick + name a route's stops on a map. Shared by trip create and edit so both
 * behave identically. Fully controlled: the parent owns the `value` list.
 */
export function RouteEditor({
  value,
  onChange,
}: {
  value: DraftStop[];
  onChange: (stops: DraftStop[]) => void;
}): ReactNode {
  const [pickerOpen, setPickerOpen] = useState(false);

  /** Merge points from the map into drafts, preserving names already typed. */
  function applyPicked(points: PickedPoint[]): void {
    onChange(
      points.map((p, i) => ({
        name: value[i]?.name ?? "",
        category: value[i]?.category ?? "",
        latitude: p.latitude,
        longitude: p.longitude,
      })),
    );
    setPickerOpen(false);
  }

  function patchStop(i: number, patch: Partial<DraftStop>): void {
    onChange(value.map((st, idx) => (idx === i ? { ...st, ...patch } : st)));
  }
  function removeStop(i: number): void {
    onChange(value.filter((_, idx) => idx !== i));
  }

  // Stops rendered on the preview map (order = list order).
  const previewStops: TripStop[] = value.map((s, i) => ({
    id: `draft-${i}`,
    order: i,
    name: s.name || `Stop ${i + 1}`,
    category: s.category || null,
    latitude: s.latitude,
    longitude: s.longitude,
    eta: null,
    notes: null,
  }));

  return (
    <>
      <Text style={[styles.label, styles.spaced]}>Route</Text>
      {value.length === 0 ? (
        <Pressable style={styles.pickCta} onPress={() => setPickerOpen(true)}>
          <Text style={styles.pickIcon}>🗺️</Text>
          <View style={styles.flex}>
            <Text style={styles.pickTitle}>Set route on map</Text>
            <Text style={styles.pickSub}>
              Tap to place your start, destination & stops
            </Text>
          </View>
          <Text style={styles.pickChevron}>›</Text>
        </Pressable>
      ) : (
        <>
          <View style={styles.previewWrap}>
            <TripMap stops={previewStops} height={160} interactive={false} />
          </View>
          <Pressable
            style={styles.editRouteBtn}
            onPress={() => setPickerOpen(true)}
          >
            <Text style={styles.editRouteText}>✏️ Edit route on map</Text>
          </Pressable>

          {value.map((s, i) => (
            <View key={i} style={styles.stopCard}>
              <View style={styles.stopCardHead}>
                <View style={styles.stopBadge}>
                  <Text style={styles.stopBadgeText}>{i + 1}</Text>
                </View>
                <Text style={styles.stopCoord}>
                  {coordLabel(s.latitude, s.longitude)}
                </Text>
                <Pressable onPress={() => removeStop(i)} hitSlop={8}>
                  <Text style={styles.removeStop}>Remove</Text>
                </Pressable>
              </View>
              <Field
                label="Name"
                value={s.name}
                onChangeText={(v) => patchStop(i, { name: v })}
                placeholder={i === 0 ? "Start point" : "Stop name"}
              />
              <Field
                label="Category (optional)"
                value={s.category}
                onChangeText={(v) => patchStop(i, { category: v })}
                placeholder="Fuel / Food / Photo"
              />
            </View>
          ))}
        </>
      )}

      <MapRoutePicker
        visible={pickerOpen}
        initial={value.map((s) => ({
          latitude: s.latitude,
          longitude: s.longitude,
        }))}
        onCancel={() => setPickerOpen(false)}
        onDone={applyPicked}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    marginBottom: spacing(1),
  },
  spaced: { marginTop: spacing(1) },
  pickCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,90,31,0.25)",
    padding: spacing(2),
    marginBottom: spacing(1.5),
  },
  pickIcon: { fontSize: 22 },
  pickTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  pickSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  pickChevron: { fontSize: 22, color: colors.muted },
  previewWrap: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    marginBottom: spacing(1),
  },
  editRouteBtn: {
    alignSelf: "flex-start",
    paddingVertical: spacing(0.75),
    marginBottom: spacing(1.5),
  },
  editRouteText: { fontSize: 13, fontWeight: "700", color: colors.primary },
  stopCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: spacing(1.5),
    marginBottom: spacing(1.5),
  },
  stopCardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    marginBottom: spacing(1),
  },
  stopBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stopBadgeText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  stopCoord: { flex: 1, fontSize: 12, fontWeight: "500", color: colors.muted },
  removeStop: { fontSize: 12, fontWeight: "600", color: "#FF453A" },
});
