import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PollType } from '@samishan11/moto-contract';
import { Button, Field, FormError } from '../components/ui';
import { Header, Page } from '../components/layout';
import { useNavigation } from '../navigation/Navigator';
import { useCreatePoll } from '../trip/hooks';
import { errorMessage } from '../api/errorMessage';
import { colors, spacing } from '../theme';

export function PollFormScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const tripId = typeof nav.params.tripId === 'string' ? nav.params.tripId : '';
  const create = useCreatePoll(tripId);

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [type, setType] = useState<PollType>('SINGLE');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  function setOption(i: number, v: string): void {
    setOptions((o) => o.map((opt, idx) => (idx === i ? v : opt)));
  }
  function addOption(): void {
    setOptions((o) => (o.length >= 10 ? o : [...o, '']));
  }
  function removeOption(i: number): void {
    setOptions((o) => (o.length <= 2 ? o : o.filter((_, idx) => idx !== i)));
  }

  function onSubmit(): void {
    setValidationError(null);
    const clean = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (question.trim().length === 0) return setValidationError('Question is required.');
    if (clean.length < 2) return setValidationError('Add at least two options.');

    create.mutate(
      { question: question.trim(), type, isAnonymous, options: clean },
      { onSuccess: () => nav.goBack() },
    );
  }

  const error = validationError ?? (create.error ? errorMessage(create.error, t) : null);

  return (
    <View style={styles.flex}>
      <Header title="New poll" />
      <Page>
        <Field
          label="Question"
          value={question}
          onChangeText={setQuestion}
          placeholder="Departure time?"
        />

        <Text style={styles.label}>Options</Text>
        {options.map((o, i) => (
          <View key={i} style={styles.optionRow}>
            <View style={styles.flex}>
              <Field
                label={`Option ${i + 1}`}
                value={o}
                onChangeText={(v) => setOption(i, v)}
                placeholder={i === 0 ? '7:00 AM' : '8:00 AM'}
              />
            </View>
            {options.length > 2 ? (
              <Pressable onPress={() => removeOption(i)} hitSlop={8} style={styles.removeOpt}>
                <Text style={styles.removeOptText}>✕</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {options.length < 10 ? (
          <Pressable onPress={addOption}>
            <Text style={styles.addOpt}>＋ Add option</Text>
          </Pressable>
        ) : null}

        {/* Single / Multiple */}
        <Text style={[styles.label, styles.spaced]}>Choice type</Text>
        <View style={styles.segmented}>
          {(['SINGLE', 'MULTIPLE'] as PollType[]).map((ty) => (
            <Pressable
              key={ty}
              style={[styles.segment, type === ty && styles.segmentActive]}
              onPress={() => setType(ty)}
            >
              <Text style={[styles.segmentText, type === ty && styles.segmentTextActive]}>
                {ty === 'SINGLE' ? 'Single choice' : 'Multiple choice'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Anonymous */}
        <Pressable style={styles.anonRow} onPress={() => setIsAnonymous((v) => !v)}>
          <View style={styles.flex}>
            <Text style={styles.anonLabel}>Anonymous</Text>
            <Text style={styles.anonHint}>Hide who voted for what in the results.</Text>
          </View>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            trackColor={{ true: colors.primary, false: '#2A2E37' }}
            thumbColor="#fff"
          />
        </Pressable>

        <FormError message={error} />
        <Button title="Create poll" onPress={onSubmit} loading={create.isPending} />
      </Page>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  label: { fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: spacing(1) },
  spaced: { marginTop: spacing(1) },
  optionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing(1) },
  removeOpt: { paddingTop: 34, paddingHorizontal: 6 },
  removeOptText: { fontSize: 16, color: colors.muted },
  addOpt: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: spacing(1.5) },

  segmented: {
    flexDirection: 'row',
    gap: spacing(1),
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: spacing(2),
  },
  segment: { flex: 1, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  segmentTextActive: { color: '#fff' },

  anonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing(1.75),
    marginBottom: spacing(2),
    gap: spacing(1.5),
  },
  anonLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  anonHint: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
