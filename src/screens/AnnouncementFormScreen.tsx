import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Field, FormError } from '../components/ui';
import { Header, Page } from '../components/layout';
import { useNavigation } from '../navigation/Navigator';
import { useCreateAnnouncement, useUpdateAnnouncement } from '../group/hooks';
import { errorMessage } from '../api/errorMessage';
import { colors, spacing } from '../theme';

export function AnnouncementFormScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const groupId = typeof nav.params.groupId === 'string' ? nav.params.groupId : '';
  // Presence of an announcementId param switches the screen into edit mode.
  const announcementId =
    typeof nav.params.announcementId === 'string' ? nav.params.announcementId : null;
  const isEdit = announcementId !== null;

  const create = useCreateAnnouncement(groupId);
  const update = useUpdateAnnouncement(groupId);

  const [title, setTitle] = useState(
    typeof nav.params.title === 'string' ? nav.params.title : '',
  );
  const [content, setContent] = useState(
    typeof nav.params.content === 'string' ? nav.params.content : '',
  );
  const [isPinned, setIsPinned] = useState(nav.params.isPinned === true);
  const [validationError, setValidationError] = useState<string | null>(null);

  function onSubmit(): void {
    setValidationError(null);
    if (title.trim().length === 0 || content.trim().length === 0) {
      setValidationError('Title and message are required.');
      return;
    }
    const body = { title: title.trim(), content: content.trim(), isPinned };
    if (isEdit) {
      update.mutate({ announcementId, body }, { onSuccess: () => nav.goBack() });
    } else {
      create.mutate(body, { onSuccess: () => nav.goBack() });
    }
  }

  const pending = create.isPending || update.isPending;
  const mutationError = create.error ?? update.error ?? null;
  const error = validationError ?? (mutationError ? errorMessage(mutationError, t) : null);

  return (
    <View style={styles.flex}>
      <Header title={isEdit ? 'Edit announcement' : 'New announcement'} />
      <Page>
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="Ride this Saturday" />
        <Field
          label="Message"
          value={content}
          onChangeText={setContent}
          placeholder="Share the details…"
          multiline
          numberOfLines={5}
          style={styles.multiline}
        />
        <Pressable style={styles.pinRow} onPress={() => setIsPinned((v) => !v)}>
          <View style={styles.pinText}>
            <Text style={styles.pinLabel}>📌 Pin to top</Text>
            <Text style={styles.pinHint}>Pinned announcements show first for everyone.</Text>
          </View>
          <Switch
            value={isPinned}
            onValueChange={setIsPinned}
            trackColor={{ true: colors.primary, false: '#2A2E37' }}
            thumbColor="#fff"
          />
        </Pressable>

        <FormError message={error} />
        <Button
          title={isEdit ? 'Save changes' : 'Post announcement'}
          onPress={onSubmit}
          loading={pending}
        />
      </Page>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  multiline: { height: 120, textAlignVertical: 'top', paddingTop: spacing(1.5) },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing(1.75),
    gap: spacing(1.5),
  },
  pinText: { flex: 1 },
  pinLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  pinHint: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
