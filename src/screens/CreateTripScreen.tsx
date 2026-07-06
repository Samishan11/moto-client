import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { CreateStopRequest, Group } from "@samishan11/moto-contract";
import { Button, Field, FormError } from "../components/ui";
import { DateField } from "../components/DateField";
import { GroupSelect } from "../components/GroupSelect";
import { Header, Page } from "../components/layout";
import { RouteEditor, type DraftStop } from "../components/RouteEditor";
import { useNavigation } from "../navigation/Navigator";
import { useCreateTrip } from "../trip/hooks";
import { errorMessage } from "../api/errorMessage";
import { colors, spacing } from "../theme";

export function CreateTripScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();

  const preGroup =
    typeof nav.params.groupId === "string" ? nav.params.groupId : null;
  const [group, setGroup] = useState<Group | null>(null);
  const groupId = preGroup ?? group?.id ?? null;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [stops, setStops] = useState<DraftStop[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const create = useCreateTrip(groupId ?? "");

  function onSubmit(): void {
    setValidationError(null);
    if (!groupId) return setValidationError("Pick a group for this trip.");
    if (title.trim().length === 0)
      return setValidationError("Title is required.");
    if (!date) return setValidationError("Pick a date.");

    const validStops: CreateStopRequest[] = stops.map((s, i) => ({
      order: i,
      name: s.name.trim() || `Stop ${i + 1}`,
      category: s.category.trim() || null,
      latitude: s.latitude,
      longitude: s.longitude,
    }));

    create.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        scheduledAt: date,
        stops: validStops.length ? validStops : undefined,
      },
      {
        onSuccess: (trip) =>
          nav.replace("tripDetail", { id: trip.id, groupId: trip.groupId }),
      },
    );
  }

  const error =
    validationError ?? (create.error ? errorMessage(create.error, t) : null);

  return (
    <View style={styles.flex}>
      <Header title="Plan a trip" />
      <Page>
        {/* Group picker (skipped when pre-selected): searchable select over
            the user's groups + latest-joined suggestions */}
        {!preGroup ? <GroupSelect value={group} onChange={setGroup} /> : null}

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

        {/* Route — pick stops on the map */}
        <RouteEditor value={stops} onChange={setStops} />

        <FormError message={error} />
        <Button
          title="Create trip"
          onPress={onSubmit}
          loading={create.isPending}
        />
      </Page>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  multiline: { height: 80, textAlignVertical: "top", paddingTop: spacing(1.5) },
});
