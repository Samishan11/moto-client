import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { EmergencyContact } from '@samishan11/moto-contract';
import { Button, Field, FormError } from '../components/ui';
import { Card, EmptyState, Header, Loading, Page } from '../components/layout';
import { useEmergencyContacts } from '../api/queries';
import { useCreateContact, useDeleteContact, useUpdateContact } from '../profile/hooks';
import { errorMessage } from '../api/errorMessage';
import { colors, spacing } from '../theme';

export function EmergencyContactsScreen(): ReactNode {
  const { t } = useTranslation();
  const contacts = useEmergencyContacts();
  const create = useCreateContact();
  const update = useUpdateContact();
  const remove = useDeleteContact();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [relation, setRelation] = useState('');
  const [priority, setPriority] = useState('1');
  const [validationError, setValidationError] = useState<string | null>(null);

  function resetForm(): void {
    setEditingId(null);
    setName('');
    setPhone('');
    setEmail('');
    setRelation('');
    setPriority('1');
    setValidationError(null);
  }

  function startEdit(c: EmergencyContact): void {
    setEditingId(c.id);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email ?? '');
    setRelation(c.relation);
    setPriority(String(c.priority));
    setValidationError(null);
  }

  function onSubmit(): void {
    setValidationError(null);
    if (name.trim().length === 0 || phone.trim().length === 0 || relation.trim().length === 0) {
      setValidationError(t('contacts.required'));
      return;
    }
    const body = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      relation: relation.trim(),
      priority: Number(priority) || 1,
    };
    const opts = { onSuccess: resetForm };
    if (editingId) update.mutate({ id: editingId, body }, opts);
    else create.mutate(body, opts);
  }

  const mutationError = create.error ?? update.error ?? remove.error ?? null;
  const error = validationError ?? (mutationError ? errorMessage(mutationError, t) : null);
  const submitting = create.isPending || update.isPending;

  return (
    <View style={styles.flex}>
      <Header title={t('contacts.title')} />
      <Page>
        {contacts.isLoading ? <Loading /> : null}
        {contacts.data?.length === 0 ? <EmptyState message={t('contacts.empty')} /> : null}

        {contacts.data?.map((c) => (
          <Card key={c.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.priority}>#{c.priority}</Text>
            </View>
            <Text style={styles.detail}>
              {c.relation} · {c.phone}
              {c.email ? ` · ${c.email}` : ''}
            </Text>
            <View style={styles.actions}>
              <Button title={t('common.edit')} variant="link" onPress={() => startEdit(c)} />
              <Button
                title={t('common.delete')}
                variant="link"
                onPress={() => remove.mutate(c.id)}
              />
            </View>
          </Card>
        ))}

        <Text style={styles.formTitle}>
          {editingId ? t('contacts.editTitle') : t('contacts.addTitle')}
        </Text>
        <Field label={t('contacts.name')} value={name} onChangeText={setName} />
        <Field
          label={t('contacts.phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Field
          label={t('contacts.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field label={t('contacts.relation')} value={relation} onChangeText={setRelation} />
        <Field
          label={t('contacts.priority')}
          value={priority}
          onChangeText={setPriority}
          keyboardType="number-pad"
        />

        <FormError message={error} />
        <Button
          title={editingId ? t('common.save') : t('contacts.add')}
          onPress={onSubmit}
          loading={submitting}
        />
        {editingId ? (
          <Button title={t('common.cancel')} variant="link" onPress={resetForm} />
        ) : null}
      </Page>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  priority: { fontSize: 13, color: colors.muted },
  detail: { fontSize: 14, color: colors.muted },
  actions: { flexDirection: 'row', gap: spacing(2) },
  formTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: spacing(2) },
});
