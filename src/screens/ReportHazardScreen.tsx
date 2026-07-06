import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import * as Location from "expo-location";
import type { HazardType } from "@moto/contract";
import { Button, Field, FormError } from "../components/ui";
import { Header, Page } from "../components/layout";
import { useNavigation } from "../navigation/Navigator";
import { useReportHazard } from "../hazard/hooks";
import { HAZARD_TYPES, HAZARD_COLOR } from "../hazard/meta";
import { errorMessage } from "../api/errorMessage";
import { colors, spacing } from "../theme";

type Coords = { lat: number; lng: number };

/**
 * Report a hazard at the rider's current location. The design ships the entry
 * point ("Report a Hazard") but not a form screen, so this is built from the
 * design tokens (warning-yellow hazard language) + the shared form kit.
 */
export function ReportHazardScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const report = useReportHazard();

  const [type, setType] = useState<HazardType | null>(null);
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Capture the current position on mount — hazards are pinned where you are.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== "granted") {
        setLocError(
          "Location permission is off — enable it to report a hazard here.",
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (!cancelled)
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onSubmit(): void {
    setValidationError(null);
    if (!type) {
      setValidationError("Pick a hazard type.");
      return;
    }
    if (!coords) {
      setValidationError("Waiting for your location…");
      return;
    }
    report.mutate(
      {
        type,
        latitude: coords.lat,
        longitude: coords.lng,
        description: description.trim() || null,
      },
      { onSuccess: () => nav.goBack() },
    );
  }

  const error =
    validationError ?? (report.error ? errorMessage(report.error, t) : null);

  return (
    <View style={styles.flex}>
      <Header title="Report a Hazard" />
      <Page>
        <Text style={styles.sectionLabel}>HAZARD TYPE</Text>
        <View style={styles.grid}>
          {HAZARD_TYPES.map((h) => {
            const active = h.type === type;
            return (
              <Pressable
                key={h.type}
                onPress={() => setType(h.type)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={h.label}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={styles.chipEmoji}>{h.emoji}</Text>
                <Text
                  style={[styles.chipLabel, active && styles.chipLabelActive]}
                >
                  {h.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Field
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Gravel across the whole lane"
          multiline
          numberOfLines={3}
          maxLength={280}
          style={styles.multiline}
        />

        <View style={styles.locRow}>
          <Text style={styles.locDot}>📍</Text>
          <Text style={styles.locText}>
            {locError
              ? locError
              : coords
                ? `Pinned to your location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
                : "Getting your location…"}
          </Text>
        </View>

        <FormError message={error} />

        <Button
          title="Report hazard"
          onPress={onSubmit}
          loading={report.isPending}
          disabled={!type || !coords}
        />
        <Text style={styles.disclaimer}>
          Warns riders nearby for 24 hours. Auto-expires.
        </Text>
      </Page>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: colors.border,
    marginBottom: spacing(1),
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(1.25),
    marginBottom: spacing(2),
  },
  chip: {
    width: "30%",
    flexGrow: 1,
    paddingVertical: spacing(1.5),
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    gap: 6,
  },
  chipActive: {
    backgroundColor: "rgba(255,214,10,0.12)",
    borderColor: "rgba(255,214,10,0.55)",
  },
  chipEmoji: { fontSize: 22 },
  chipLabel: { fontSize: 12, fontWeight: "600", color: colors.muted },
  chipLabelActive: { color: HAZARD_COLOR },
  multiline: { minHeight: 84, textAlignVertical: "top" },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: spacing(1.25),
    marginBottom: spacing(1),
  },
  locDot: { fontSize: 14 },
  locText: { flex: 1, fontSize: 13, color: colors.muted },
  disclaimer: {
    fontSize: 12,
    color: colors.border,
    textAlign: "center",
    marginTop: spacing(1.5),
  },
});
