import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GroupVisibility } from '@moto/contract';
import { Button, Field, FormError } from '../components/ui';
import { Header, Page } from '../components/layout';
import { useNavigation } from '../navigation/Navigator';
import { useCreateGroup } from '../group/hooks';
import { errorMessage } from '../api/errorMessage';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../theme';

export function GroupFormScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const create = useCreateGroup();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState<GroupVisibility>('PUBLIC');
  const [validationError, setValidationError] = useState<string | null>(null);

  function onSubmit(): void {
    setValidationError(null);
    if (name.trim().length === 0) {
      setValidationError('Group name is required.');
      return;
    }
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        visibility,
      },
      { onSuccess: (group) => nav.replace('groupDetail', { id: group.id }) },
    );
  }

  const error = validationError ?? (create.error ? errorMessage(create.error, t) : null);

  return (
    <View style={styles.flex}>
      <Header title="Create group" />
      <Page>
        <Field
          label="Group name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Alpine Riders"
        />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What's this group about?"
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />
        <Field
          label="Location"
          value={location}
          onChangeText={setLocation}
          placeholder="City or region"
        />

        {/* Visibility toggle */}
        <Text style={styles.label}>Visibility</Text>
        <View style={styles.segmented}>
          {(['PUBLIC', 'PRIVATE'] as GroupVisibility[]).map((v) => {
            const active = visibility === v;
            return (
              <Pressable
                key={v}
                style={[styles.segment, active && styles.segmentActive]}
                onPress={() => setVisibility(v)}
                accessibilityRole="button"
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {v === 'PUBLIC' ? '🌐 Public' : '🔒 Private'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>
          {visibility === 'PUBLIC'
            ? 'Anyone can find and join this group instantly.'
            : 'People must request to join and be approved.'}
        </Text>

        <FormError message={error} />
        <Button title="Create group" onPress={onSubmit} loading={create.isPending} />
      </Page>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  multiline: { height: 84, textAlignVertical: 'top', paddingTop: spacing(1.5) },
  label: { fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: spacing(1) },
  segmented: {
    flexDirection: 'row',
    gap: spacing(1),
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
  },
  segment: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  segmentTextActive: { color: '#fff' },
  hint: { fontSize: 12, color: colors.muted, marginTop: spacing(1) },
});
