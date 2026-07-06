import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { CreateStopRequest, TripDetail } from "@samishan11/moto-contract";
import { Button, Field, FormError } from "../components/ui";
import { DateField } from "../components/DateField";
import { Header, Loading, Page } from "../components/layout";
import { RouteEditor, type DraftStop } from "../components/RouteEditor";
import { useNavigation } from "../navigation/Navigator";
import { useTrip } from "../api/queries";
import { useReplaceStops, useUpdateTrip } from "../trip/hooks";
import { errorMessage } from "../api/errorMessage";
import { colors, spacing } from "../theme";

/** Compare two draft-stop lists (order + coords + labels) for changes. */
function stopsEqual(a: DraftStop[], b: DraftStop[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((s, i) => {
    const o = b[i];
    return (
      s.name === o.name &&
      s.category === o.category &&
      s.latitude === o.latitude &&
      s.longitude === o.longitude
    );
  });
}

function toDraft(trip: TripDetail): DraftStop[] {
  return [...trip.stops]
    .sort((x, y) => x.order - y.order)
    .map((s) => ({
      name: s.name,
      category: s.category ?? "",
      latitude: s.latitude,
      longitude: s.longitude,
    }));
}

/**
 * Edit a trip's core details (title / description / destination / date). Route
 * stops are managed separately, so they're not part of this form. Reached from
 * TripDetail's "Edit trip" (creator, upcoming only); the backend re-checks edit
 * rights.
 */
export function EditTripScreen(): ReactNode {
  const nav = useNavigation();
  const id = typeof nav.params.id === "string" ? nav.params.id : "";
  const trip = useTrip(id);

  return (
    <View style={styles.flex}>
      {trip.data ? <Form trip={trip.data} /> : <Loading />}
    </View>
  );
}

function Form({ trip }: { trip: TripDetail }): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const update = useUpdateTrip(trip.id, trip.groupId);
  const replaceStops = useReplaceStops(trip.id, trip.groupId);

  const original = toDraft(trip);
  const [title, setTitle] = useState(trip.title);
  const [description, setDescription] = useState(trip.description ?? "");
  const [location, setLocation] = useState(trip.location ?? "");
  const [date, setDate] = useState<string | null>(trip.scheduledAt);
  const [stops, setStops] = useState<DraftStop[]>(original);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function onSubmit(): Promise<void> {
    setValidationError(null);
    if (title.trim().length === 0) {
      setValidationError("Title is required.");
      return;
    }
    if (!date) {
      setValidationError("Pick a date.");
      return;
    }
    try {
      await update.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        scheduledAt: date,
      });
      // Only rewrite the route when it actually changed.
      if (!stopsEqual(stops, original)) {
        const payload: CreateStopRequest[] = stops.map((s, i) => ({
          order: i,
          name: s.name.trim() || `Stop ${i + 1}`,
          category: s.category.trim() || null,
          latitude: s.latitude,
          longitude: s.longitude,
        }));
        await replaceStops.mutateAsync(payload);
      }
      nav.goBack();
    } catch {
      /* mutation error surfaces via the hooks' error state below */
    }
  }

  const saving = update.isPending || replaceStops.isPending;
  const error =
    validationError ??
    (update.error
      ? errorMessage(update.error, t)
      : replaceStops.error
        ? errorMessage(replaceStops.error, t)
        : null);

  return (
    <View style={styles.flex}>
      <Header title="Edit trip" />
      <Page>
        <Field
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Kathmandu to Pokhara"
        />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What's the plan?"
          multiline
          style={styles.multiline}
        />
        <Field
          label="Destination"
          value={location}
          onChangeText={setLocation}
          placeholder="Pokhara"
        />
        <DateField label="Date" value={date} onChange={setDate} />

        <RouteEditor value={stops} onChange={setStops} />

        <FormError message={error} />
        <Button title="Save changes" onPress={onSubmit} loading={saving} />
      </Page>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  multiline: { height: 80, textAlignVertical: "top", paddingTop: spacing(1.5) },
});
