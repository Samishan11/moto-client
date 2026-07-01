import { useState, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Bike, CreateBikeRequest } from '@moto/contract';
import { Button, Field, FormError } from '../components/ui';
import { DateField } from '../components/DateField';
import { Header, Loading, Page } from '../components/layout';
import { useNavigation } from '../navigation/Navigator';
import { useBike } from '../api/queries';
import { useCreateBike, useUpdateBike } from '../garage/hooks';
import { errorMessage } from '../api/errorMessage';
import { colors } from '../theme';

export function BikeFormScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const editId = typeof nav.params.id === 'string' ? nav.params.id : null;
  const existing = useBike(editId ?? '');

  const title = editId ? t('bikeForm.editTitle') : t('bikeForm.addTitle');

  return (
    <View style={styles.flex}>
      <Header title={title} />
      {editId && !existing.data ? <Loading /> : <Form bike={editId ? existing.data : undefined} />}
    </View>
  );
}

function Form({ bike }: { bike?: Bike }): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const create = useCreateBike();
  const update = useUpdateBike();

  const [brand, setBrand] = useState(bike?.brand ?? '');
  const [model, setModel] = useState(bike?.model ?? '');
  const [cc, setCc] = useState(bike?.cc != null ? String(bike.cc) : '');
  const [registrationNum, setRegistrationNum] = useState(bike?.registrationNum ?? '');
  const [vin, setVin] = useState(bike?.vin ?? '');
  const [purchaseDate, setPurchaseDate] = useState<string | null>(bike?.purchaseDate ?? null);
  const [insuranceExpiry, setInsuranceExpiry] = useState<string | null>(
    bike?.insuranceExpiry ?? null,
  );
  const [registrationExpiry, setRegistrationExpiry] = useState<string | null>(
    bike?.registrationExpiry ?? null,
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  function onSubmit(): void {
    setValidationError(null);
    if (brand.trim().length === 0 || model.trim().length === 0) {
      setValidationError(t('bikeForm.brandModelRequired'));
      return;
    }
    if (cc.trim() !== '' && Number.isNaN(Number(cc))) {
      setValidationError(t('bikeForm.ccInvalid'));
      return;
    }
    const body: CreateBikeRequest = {
      brand: brand.trim(),
      model: model.trim(),
      cc: cc.trim() === '' ? null : Number(cc),
      registrationNum: registrationNum.trim() || null,
      vin: vin.trim() || null,
      purchaseDate,
      insuranceExpiry,
      registrationExpiry,
    };
    const opts = { onSuccess: () => nav.goBack() };
    if (bike) update.mutate({ id: bike.id, body }, opts);
    else create.mutate(body, opts);
  }

  const mutationError = create.error ?? update.error ?? null;
  const error = validationError ?? (mutationError ? errorMessage(mutationError, t) : null);

  return (
    <Page>
      <Field label={t('bikeForm.brand')} value={brand} onChangeText={setBrand} />
      <Field label={t('bikeForm.model')} value={model} onChangeText={setModel} />
      <Field label={t('bikeForm.cc')} value={cc} onChangeText={setCc} keyboardType="number-pad" />
      <Field
        label={t('bikeForm.registrationNum')}
        value={registrationNum}
        onChangeText={setRegistrationNum}
        autoCapitalize="characters"
      />
      <Field label={t('bikeForm.vin')} value={vin} onChangeText={setVin} autoCapitalize="characters" />
      <DateField
        label={t('bikeForm.purchaseDate')}
        value={purchaseDate}
        onChange={setPurchaseDate}
        optional
      />
      <DateField
        label={t('bikeForm.insuranceExpiry')}
        value={insuranceExpiry}
        onChange={setInsuranceExpiry}
        optional
      />
      <DateField
        label={t('bikeForm.registrationExpiry')}
        value={registrationExpiry}
        onChange={setRegistrationExpiry}
        optional
      />

      <FormError message={error} />
      <Button
        title={bike ? t('common.save') : t('bikeForm.create')}
        onPress={onSubmit}
        loading={create.isPending || update.isPending}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
});
