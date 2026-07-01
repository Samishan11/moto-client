import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { Reminder } from '@moto/contract';
import { Button, Notice } from '../components/ui';
import { Card, EmptyState, Header, LinkRow, Loading, Page } from '../components/layout';
import { useNavigation } from '../navigation/Navigator';
import { useBikes, useReminders } from '../api/queries';
import { colors, spacing } from '../theme';

function reminderLabel(r: Reminder, t: TFunction): string {
  const what =
    r.kind === 'INSURANCE_EXPIRY' ? t('reminders.insurance') : t('reminders.registration');
  if (r.daysUntilDue < 0) return t('reminders.overdue', { what, days: -r.daysUntilDue });
  if (r.daysUntilDue === 0) return t('reminders.today', { what });
  return t('reminders.dueIn', { what, days: r.daysUntilDue });
}

export function GarageScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const bikes = useBikes();
  const reminders = useReminders();

  return (
    <View style={styles.flex}>
      <Header
        title={t('garage.title')}
        right={
          <Button title={t('garage.add')} variant="link" onPress={() => nav.navigate('bikeForm')} />
        }
      />
      <Page>
        {reminders.data && reminders.data.length > 0 ? (
          <View style={styles.reminders}>
            <Text style={styles.sectionLabel}>{t('reminders.title')}</Text>
            {reminders.data.map((r) => (
              <Notice
                key={`${r.bikeId}-${r.kind}`}
                tone="warning"
                message={`${r.bikeLabel}: ${reminderLabel(r, t)}`}
              />
            ))}
          </View>
        ) : null}

        {bikes.isLoading ? <Loading /> : null}
        {bikes.data?.length === 0 ? (
          <Card>
            <EmptyState message={t('garage.empty')} />
            <Button title={t('garage.addFirst')} onPress={() => nav.navigate('bikeForm')} />
          </Card>
        ) : null}

        {bikes.data?.map((b) => (
          <LinkRow
            key={b.id}
            title={`${b.brand} ${b.model}`}
            subtitle={[b.cc ? `${b.cc} cc` : null, b.registrationNum].filter(Boolean).join(' · ')}
            onPress={() => nav.navigate('bikeDetail', { id: b.id })}
          />
        ))}
      </Page>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  reminders: { gap: spacing(0.75) },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
});
