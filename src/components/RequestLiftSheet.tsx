import { useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, Field, FormError } from "./ui";
import { MapRoutePicker, type PickedPoint } from "./MapRoutePicker";
import { useRequestLift } from "../lift/hooks";
import { errorMessage } from "../api/errorMessage";
import { colors, spacing } from "../theme";

/**
 * Ask for a lift from the rider's current location to a destination they pick on
 * the map. Pickup = `from` (the caller's live position).
 */
export function RequestLiftSheet({
  visible,
  from,
  onClose,
}: {
  visible: boolean;
  from: { lat: number; lng: number } | null;
  onClose: () => void;
}): ReactNode {
  const { t } = useTranslation();
  const request = useRequestLift();

  const [dest, setDest] = useState<PickedPoint | null>(null);
  const [toLabel, setToLabel] = useState("");
  const [note, setNote] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  function reset(): void {
    setDest(null);
    setToLabel("");
    setNote("");
    setValidationError(null);
  }

  function submit(): void {
    setValidationError(null);
    if (!from) return setValidationError("Waiting for your location…");
    if (!dest) return setValidationError("Pick where you need to go.");
    request.mutate(
      {
        fromLat: from.lat,
        fromLng: from.lng,
        toLat: dest.latitude,
        toLng: dest.longitude,
        toLabel: toLabel.trim() || null,
        note: note.trim() || null,
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    );
  }

  const error =
    validationError ?? (request.error ? errorMessage(request.error, t) : null);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Request a lift</Text>
          <Text style={styles.sub}>
            Nearby riders in your groups will be asked. First to accept picks
            you up.
          </Text>

          <Pressable style={styles.destBtn} onPress={() => setPickerOpen(true)}>
            <Text style={styles.destIcon}>📍</Text>
            <View style={styles.flex}>
              <Text style={styles.destTitle}>
                {dest ? "Destination set" : "Set destination on map"}
              </Text>
              <Text style={styles.destSub}>
                {dest
                  ? `${dest.latitude.toFixed(4)}, ${dest.longitude.toFixed(4)}`
                  : "Tap to pick where you’re going"}
              </Text>
            </View>
            <Text style={styles.destChevron}>›</Text>
          </Pressable>

          <Field
            label="Destination name (optional)"
            value={toLabel}
            onChangeText={setToLabel}
            placeholder="e.g. Office"
          />
          <Field
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Need to reach by 9am"
          />

          <FormError message={error} />

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <View style={styles.flex}>
              <Button
                title="Request lift"
                onPress={submit}
                loading={request.isPending}
                disabled={!dest}
              />
            </View>
          </View>
        </View>
      </View>

      <MapRoutePicker
        visible={pickerOpen}
        initial={dest ? [dest] : []}
        onCancel={() => setPickerOpen(false)}
        onDone={(pts) => {
          // Single destination — take the last-placed point.
          if (pts.length) setDest(pts[pts.length - 1]);
          setPickerOpen(false);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing(2.5),
    paddingBottom: spacing(4),
    gap: spacing(1),
  },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: spacing(1.5),
  },
  title: { fontSize: 20, fontWeight: "800", color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginBottom: spacing(1) },
  flex: { flex: 1 },
  destBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,90,31,0.25)",
    padding: spacing(1.75),
    marginBottom: spacing(1),
  },
  destIcon: { fontSize: 20 },
  destTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  destSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  destChevron: { fontSize: 22, color: colors.muted },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    marginTop: spacing(1),
  },
  cancelBtn: {
    height: 54,
    paddingHorizontal: spacing(2.5),
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 15, fontWeight: "700", color: colors.muted },
});
