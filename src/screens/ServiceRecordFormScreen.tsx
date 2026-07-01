import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CreateServiceRecordRequest } from '@moto/contract';
import { Button, Field, FormError } from '../components/ui';
import { DateField } from '../components/DateField';
import { Header, Page } from '../components/layout';
import { useNavigation } from '../navigation/Navigator';
import { useBike } from '../api/queries';
import { useCreateServiceRecord, useUpdateServiceRecord } from '../garage/hooks';
import { uploadLocalFile } from '../api/upload';
import { errorMessage } from '../api/errorMessage';
import { pickImage, type PickedFile } from '../lib/imagePicker';
import { dateToIsoDay } from '../lib/date';
import { colors } from '../theme';

export function ServiceRecordFormScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const bikeId = typeof nav.params.bikeId === 'string' ? nav.params.bikeId : '';
  const recordId = typeof nav.params.recordId === 'string' ? nav.params.recordId : null;

  const bike = useBike(bikeId);
  const existing = recordId ? bike.data?.serviceRecords.find((r) => r.id === recordId) : undefined;

  const create = useCreateServiceRecord();
  const update = useUpdateServiceRecord();

  const [type, setType] = useState(existing?.type ?? '');
  const [date, setDate] = useState<string | null>(existing?.date ?? dateToIsoDay(new Date()));
  const [odometer, setOdometer] = useState(existing?.odometer != null ? String(existing.odometer) : '');
  const [cost, setCost] = useState(existing?.cost != null ? String(existing.cost) : '');
  const [workshop, setWorkshop] = useState(existing?.workshop ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [invoice, setInvoice] = useState<PickedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function onPickInvoice(): Promise<void> {
    const file = await pickImage();
    if (file) setInvoice(file);
  }

  async function onSubmit(): Promise<void> {
    setValidationError(null);
    if (type.trim().length === 0) {
      setValidationError(t('service.typeRequired'));
      return;
    }
    if (!date) {
      setValidationError(t('errors.validation.date'));
      return;
    }
    if (cost.trim() !== '' && Number.isNaN(Number(cost))) {
      setValidationError(t('service.costInvalid'));
      return;
    }

    let invoiceKey: string | undefined;
    if (invoice) {
      try {
        setUploading(true);
        invoiceKey = await uploadLocalFile('SERVICE_INVOICE', invoice.uri, invoice.contentType);
      } catch (err) {
        setUploading(false);
        setValidationError(errorMessage(err, t));
        return;
      }
      setUploading(false);
    }

    const body: CreateServiceRecordRequest = {
      type: type.trim(),
      date,
      odometer: odometer.trim() === '' ? null : Number(odometer),
      cost: cost.trim() === '' ? null : Number(cost),
      workshop: workshop.trim() || null,
      notes: notes.trim() || null,
      ...(invoiceKey ? { invoiceKey } : {}),
    };

    const opts = { onSuccess: () => nav.goBack() };
    if (recordId) update.mutate({ bikeId, recordId, body }, opts);
    else create.mutate({ bikeId, body }, opts);
  }

  const mutationError = create.error ?? update.error ?? null;
  const error = validationError ?? (mutationError ? errorMessage(mutationError, t) : null);
  const busy = uploading || create.isPending || update.isPending;

  const invoiceLabel = invoice
    ? t('service.invoiceSelected')
    : existing?.invoiceUrl
      ? t('service.invoiceReplace')
      : t('service.invoiceAdd');

  return (
    <View style={styles.flex}>
      <Header title={recordId ? t('service.editTitle') : t('service.addTitle')} />
      <Page>
        <Field label={t('service.type')} value={type} onChangeText={setType} />
        <DateField label={t('service.date')} value={date} onChange={setDate} />
        <Field
          label={t('service.odometer')}
          value={odometer}
          onChangeText={setOdometer}
          keyboardType="number-pad"
        />
        <Field
          label={t('service.cost')}
          value={cost}
          onChangeText={setCost}
          keyboardType="decimal-pad"
        />
        <Field label={t('service.workshop')} value={workshop} onChangeText={setWorkshop} />
        <Field
          label={t('service.notes')}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <Button title={invoiceLabel} variant="link" onPress={onPickInvoice} />
        {invoice ? <Text style={styles.invoiceNote}>{invoice.uri.split('/').pop()}</Text> : null}

        <FormError message={error} />
        <Button title={recordId ? t('common.save') : t('service.create')} onPress={onSubmit} loading={busy} />
      </Page>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  invoiceNote: { fontSize: 12, color: colors.muted },
});
